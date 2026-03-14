import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} from "discord.js"

import db from "../database/db.js"

export default (client) => {

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}

    /* =====================================================================
       EVENTO 1: INTERAÇÕES (Comandos, Botões, Menus e Modais)
       ===================================================================== */
    client.on("interactionCreate", async interaction => {

        try {
            /* ================= SLASH COMMAND ================= */
            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === "painel") {

                    if (!interaction.member.permissions.has("Administrator")) {
                        return interaction.reply({
                            content: "❌ Apenas administradores podem usar este painel.",
                            ephemeral: true
                        });
                    }

                    // PAINEL AGORA É APENAS TEXTO (SEM EMBED)
                    const mensagemPainel = "⚙️ **Painel de Controle - Sistema de Feedback**\n\nUtilize os botões abaixo para gerenciar como os feedbacks serão recebidos no servidor.\n\n*(Use o botão Configurar Aparência para alterar a cor, imagem e textos da Embed que será enviada para os membros)*";

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("config_channel")
                            .setLabel("Canal Feedback")
                            .setEmoji("<:emoji_63:1482158321120051290>")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("config_embed_modal")
                            .setLabel("Configurar Aparência")
                            .setEmoji("<:emoji_62:1482158294649934017>")
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId("send_embed")
                            .setLabel("Enviar Embed")
                            .setEmoji("<a:emoji_60:1482141690721734776>")
                            .setStyle(ButtonStyle.Success)
                    );

                    return interaction.reply({
                        content: mensagemPainel,
                        components: [row1],
                        ephemeral: true
                    });
                }
            }

            /* ================= BOTÕES ================= */
            if (interaction.isButton()) {

                const userId = interaction.user.id

                if (interaction.customId === "config_channel") {
                    const menu = new ChannelSelectMenuBuilder()
                        .setCustomId("select_feedback_channel")
                        .setPlaceholder("Selecione o canal de feedback")
                        .setChannelTypes(ChannelType.GuildText)

                    const row = new ActionRowBuilder().addComponents(menu)

                    return interaction.reply({
                        content: "📢 Escolha o canal onde os feedbacks serão enviados:",
                        components: [row],
                        ephemeral: true
                    });
                }

                if (interaction.customId === "config_embed_modal") {
                    const modal = new ModalBuilder()
                        .setCustomId("modal_config_submit")
                        .setTitle("Configurar Embed");

                    const textInput = new TextInputBuilder()
                        .setCustomId("input_texto")
                        .setLabel("Título | Descrição")
                        .setPlaceholder("Ex: Meu Título | Minha descrição aqui...")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    const imageInput = new TextInputBuilder()
                        .setCustomId("input_imagem")
                        .setLabel("Link da Imagem")
                        .setPlaceholder("Ex: https://meusite.com/imagem.png")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const colorInput = new TextInputBuilder()
                        .setCustomId("input_cor")
                        .setLabel("Cor HEX")
                        .setPlaceholder("Ex: #ffffff")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const buttonInput = new TextInputBuilder()
                        .setCustomId("input_botao")
                        .setLabel("Botão (Emoji | Texto)")
                        .setPlaceholder("Ex: ⭐ | Enviar Feedback")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const row1 = new ActionRowBuilder().addComponents(textInput);
                    const row2 = new ActionRowBuilder().addComponents(imageInput);
                    const row3 = new ActionRowBuilder().addComponents(colorInput);
                    const row4 = new ActionRowBuilder().addComponents(buttonInput);

                    modal.addComponents(row1, row2, row3, row4);

                    return interaction.showModal(modal);
                }

                if (interaction.customId === "send_embed") {
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        
                        try {
                            // Validação de cor para não crashar
                            let corFinal = row?.embedColor || "#FFFFFF";
                            if (!corFinal.startsWith("#")) corFinal = "#FFFFFF";

                            const embed = new EmbedBuilder()
                                .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
                                .setDescription(row?.embedDescription || "Clique no botão abaixo.")
                                .setColor(corFinal);
                                
                            // Validação de link de imagem para não crashar
                            let imagemFinal = row?.embedImage;
                            if (imagemFinal && imagemFinal.startsWith("http")) {
                                embed.setImage(imagemFinal);
                            }

                            const button = new ButtonBuilder()
                                .setCustomId("start_feedback")
                                .setLabel(row?.buttonLabel || "Enviar Feedback")
                                .setStyle(ButtonStyle.Primary);

                            // Validação de emoji
                            try {
                                if (row?.buttonEmoji) {
                                    button.setEmoji(row.buttonEmoji);
                                } else {
                                    button.setEmoji("⭐");
                                }
                            } catch (emojiErro) {
                                button.setEmoji("⭐"); // Se o emoji salvo for inválido, usa a estrela
                            }

                            const rowBtn = new ActionRowBuilder().addComponents(button);

                            await interaction.channel.send({
                                embeds: [embed],
                                components: [rowBtn]
                            });

                            return interaction.reply({
                                content: "✅ Embed enviada com sucesso no chat!",
                                ephemeral: true
                            });

                        } catch (erroEmbed) {
                            console.error("Erro ao gerar a embed:", erroEmbed);
                            return interaction.reply({
                                content: "❌ Ocorreu um erro ao montar a Embed. Verifique se a cor HEX e a URL da Imagem estão corretas em 'Configurar Aparência'.",
                                ephemeral: true
                            });
                        }
                    });
                }

                if (interaction.customId === "start_feedback") {
                    const guild = interaction.guild;
                    const user = interaction.user;

                    const canalExistente = guild.channels.cache.find(c => c.name === `feedback-${user.id}`);
                    if (canalExistente) {
                        return interaction.reply({
                            content: `❌ Você já tem um canal de feedback aberto em <#${canalExistente.id}>`,
                            ephemeral: true
                        });
                    }

                    const novoCanal = await guild.channels.create({
                        name: `feedback-${user.id}`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: user.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                            },
                            {
                                id: interaction.client.user.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                            }
                        ]
                    });

                    interaction.reply({
                        content: `✅ Canal criado! Vá para <#${novoCanal.id}> para iniciar.`,
                        ephemeral: true
                    });

                    client.feedbackStep[userId] = "media";

                    return novoCanal.send({
                        content: `<@${user.id}>`,
                        embeds: [new EmbedBuilder().setColor("#fcba03").setDescription("📷 **Passo 1:** Envie uma imagem ou vídeo do resultado.")]
                    });
                }
            }

            /* ================= RECEBENDO O MODAL ================= */
            if (interaction.isModalSubmit()) {
                if (interaction.customId === "modal_config_submit") {
                    const textoRaw = interaction.fields.getTextInputValue("input_texto");
                    const imagem = interaction.fields.getTextInputValue("input_imagem");
                    const cor = interaction.fields.getTextInputValue("input_cor");
                    const botaoRaw = interaction.fields.getTextInputValue("input_botao");

                    let titulo = "⭐ Envie seu Feedback";
                    let descricao = "Clique no botão abaixo.";
                    if (textoRaw) {
                        const partes = textoRaw.split("|").map(p => p.trim());
                        titulo = partes[0] || titulo;
                        descricao = partes[1] || descricao;
                    }

                    let emojiBotao = "⭐";
                    let textoBotao = "Enviar Feedback";
                    if (botaoRaw) {
                        const partes = botaoRaw.split("|").map(p => p.trim());
                        emojiBotao = partes[0] || emojiBotao;
                        textoBotao = partes[1] || textoBotao;
                    }

                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                row?.feedbackChannel || null, 
                                titulo, 
                                descricao, 
                                cor || "#ffffff", 
                                imagem || null, 
                                emojiBotao, 
                                textoBotao
                            ]
                        );
                    });

                    return interaction.reply({
                        content: "✅ Cores, textos e imagens atualizados com sucesso! Tente clicar em **Enviar Embed** agora.",
                        ephemeral: true
                    });
                }
            }

            /* ================= MENU CANAL ================= */
            if (interaction.isChannelSelectMenu()) {
                if (interaction.customId === "select_feedback_channel") {
                    const channelId = interaction.values[0]

                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                channelId,
                                row?.embedTitle || null,
                                row?.embedDescription || null,
                                row?.embedColor || null,
                                row?.embedImage || null,
                                row?.buttonEmoji || null,
                                row?.buttonLabel || null
                            ]
                        );
                    });

                    return interaction.reply({
                        content: `✅ Canal configurado: <#${channelId}>`,
                        ephemeral: true
                    });
                }
            }

        } catch (err) {
            console.error("Erro interaction:", err)
        }
    });

    /* =====================================================================
       EVENTO 2: MENSAGENS (Passo a passo dentro do Ticket)
       ===================================================================== */
    client.on("messageCreate", async msg => {

        if (msg.author.bot) return;
        if (!msg.guild) return;

        const userId = msg.author.id;

        if (msg.channel.name === `feedback-${userId}`) {

            const step = client.feedbackStep[userId];

            if (step === "media") {
                if (msg.attachments.size === 0) {
                    return msg.reply("❌ Por favor, envie uma imagem ou vídeo para continuar.");
                }
                client.feedbackMedia[userId] = msg.attachments.first().url;
                client.feedbackStep[userId] = "phone";
                return msg.reply("📱 **Passo 2:** Qual modelo do celular você usa?\nEx: iPhone 12 / Redmi Note 11");
            }

            if (step === "phone") {
                client.feedbackPhone[userId] = msg.content;
                client.feedbackStep[userId] = "text";
                return msg.reply("💬 **Passo 3:** Agora escreva seu feedback detalhado.");
            }

            if (step === "text") {
                const feedbackText = msg.content;

                db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [msg.guild.id], async (err, row) => {
                    
                    if (!row?.feedbackChannel) {
                        return msg.reply("❌ O canal oficial de feedback não foi configurado pelo administrador.");
                    }

                    const channel = msg.guild.channels.cache.get(row.feedbackChannel);

                    if (!channel) {
                        return msg.reply("❌ Canal de feedback não encontrado. Ele pode ter sido apagado.");
                    }

                    const embed = new EmbedBuilder()
                        .setTitle("⭐ Novo Feedback")
                        .addFields(
                            {
                                name: "📱 Celular",
                                value: client.feedbackPhone[userId] || "Não informado",
                                inline: true
                            },
                            {
                                name: "💬 Feedback",
                                value: feedbackText,
                                inline: false
                            }
                        )
                        .setThumbnail(msg.author.displayAvatarURL())
                        .setImage(client.feedbackMedia[userId])
                        .setColor("#FFD700")
                        .setFooter({ text: `Cliente: ${msg.author.tag}` });

                    await channel.send({ embeds: [embed] });

                    await msg.reply("✅ Feedback enviado com sucesso! Este canal será fechado em 3 segundos...");

                    delete client.feedbackStep[userId];
                    delete client.feedbackMedia[userId];
                    delete client.feedbackPhone[userId];

                    setTimeout(() => {
                        msg.channel.delete().catch(console.error);
                    }, 3000);

                });
            }
        }
    });

}
