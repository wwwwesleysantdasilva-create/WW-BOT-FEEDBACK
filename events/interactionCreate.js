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

    // Memória temporária para o sistema de tickets
    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} // Nova memória para guardar o texto do feedback

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

                    // PAINEL: APENAS A IMAGEM
                    const imagemPainel = "https://cdn.discordapp.com/attachments/1457915880481624094/1481517561253466213/IMG_2135.jpg?ex=69b5947f&is=69b442ff&hm=76eee3dcea3d75d1afe09d0ee20faa41c36fc216b8b1ce4e4775283cc275f2e3&";

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
                        content: imagemPainel, 
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

                    const tituloInput = new TextInputBuilder()
                        .setCustomId("input_titulo")
                        .setLabel("Título")
                        .setPlaceholder("Ex: Envie seu Feedback")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const descInput = new TextInputBuilder()
                        .setCustomId("input_descricao")
                        .setLabel("Descrição")
                        .setPlaceholder("Ex: Clique no botão abaixo para nos avaliar.")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    const colorInput = new TextInputBuilder()
                        .setCustomId("input_cor")
                        .setLabel("Cor HEX")
                        .setPlaceholder("Ex: #ffffff")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const imageInput = new TextInputBuilder()
                        .setCustomId("input_imagem")
                        .setLabel("Link da Imagem")
                        .setPlaceholder("Ex: https://meusite.com/imagem.png")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const emojiInput = new TextInputBuilder()
                        .setCustomId("input_emoji")
                        .setLabel("Emoji do Botão")
                        .setPlaceholder("Ex: ⭐ ou <:emoji_id:123456789>")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const row1 = new ActionRowBuilder().addComponents(tituloInput);
                    const row2 = new ActionRowBuilder().addComponents(descInput);
                    const row3 = new ActionRowBuilder().addComponents(colorInput);
                    const row4 = new ActionRowBuilder().addComponents(imageInput);
                    const row5 = new ActionRowBuilder().addComponents(emojiInput);

                    modal.addComponents(row1, row2, row3, row4, row5);

                    return interaction.showModal(modal);
                }

                if (interaction.customId === "send_embed") {
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        
                        try {
                            let corFinal = row?.embedColor || "#FFFFFF";
                            if (!corFinal.startsWith("#")) corFinal = "#FFFFFF";

                            const embed = new EmbedBuilder()
                                .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
                                .setDescription(row?.embedDescription || "Clique no botão abaixo.")
                                .setColor(corFinal);
                                
                            let imagemFinal = row?.embedImage;
                            if (imagemFinal && imagemFinal.startsWith("http")) {
                                embed.setImage(imagemFinal);
                            }

                            const button = new ButtonBuilder()
                                .setCustomId("start_feedback")
                                .setLabel(row?.buttonLabel || "Enviar Feedback")
                                .setStyle(ButtonStyle.Primary);

                            try {
                                if (row?.buttonEmoji) {
                                    button.setEmoji(row.buttonEmoji);
                                } else {
                                    button.setEmoji("⭐");
                                }
                            } catch (emojiErro) {
                                button.setEmoji("⭐");
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

                // === INÍCIO DO SISTEMA DE TICKET PRIVADO ===
                if (interaction.customId === "start_feedback") {
                    const guild = interaction.guild;
                    const user = interaction.user;

                    // O bot verifica se o usuário já tem canal pelo seu passo a passo ou pelo nome
                    if (client.feedbackStep[user.id]) {
                        return interaction.reply({
                            content: `❌ Você já tem um feedback em andamento!`,
                            ephemeral: true
                        });
                    }

                    // Formata o nome do canal: 💚-feedback-nomedousuario (Discord formata automático)
                    const novoCanal = await guild.channels.create({
                        name: `💚-feedback-${user.username}`,
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

                    // Define o primeiro passo como "phone"
                    client.feedbackStep[user.id] = "phone";

                    const embedPasso1 = new EmbedBuilder()
                        .setColor("#FFFFFF")
                        .setDescription("<:emoji_35:1477664716204540118> Informe Seu Celular");

                    return novoCanal.send({
                        content: `<@${user.id}>`, // Marca o usuário fora da embed
                        embeds: [embedPasso1]
                    });
                }
            }

            /* ================= RECEBENDO O MODAL ================= */
            if (interaction.isModalSubmit()) {
                if (interaction.customId === "modal_config_submit") {
                    
                    const titulo = interaction.fields.getTextInputValue("input_titulo") || "⭐ Envie seu Feedback";
                    const descricao = interaction.fields.getTextInputValue("input_descricao") || "Clique no botão abaixo.";
                    const cor = interaction.fields.getTextInputValue("input_cor") || "#ffffff";
                    const imagem = interaction.fields.getTextInputValue("input_imagem") || null;
                    const emojiBotao = interaction.fields.getTextInputValue("input_emoji") || "⭐";
                    
                    const textoBotao = "Enviar Feedback"; 

                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                row?.feedbackChannel || null, 
                                titulo, 
                                descricao, 
                                cor, 
                                imagem, 
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

        // Verifica se a mensagem está no canal de feedback e se o usuário está no fluxo
        if (client.feedbackStep[userId] && msg.channel.name.includes("feedback")) {

            const step = client.feedbackStep[userId];

            // PASSO 1 - Recebe o Celular e pede o Feedback
            if (step === "phone") {
                client.feedbackPhone[userId] = msg.content;
                client.feedbackStep[userId] = "text";
                
                const embedPasso2 = new EmbedBuilder()
                    .setColor("#FFFFFF")
                    .setDescription("<:emoji_35:1477664716204540118> Envie Seu feedback");

                return msg.channel.send({
                    content: `<@${userId}>`,
                    embeds: [embedPasso2]
                });
            }

            // PASSO 2 - Recebe o Feedback e pede a Mídia (Clipe)
            if (step === "text") {
                client.feedbackText[userId] = msg.content;
                client.feedbackStep[userId] = "media";
                
                const embedPasso3 = new EmbedBuilder()
                    .setColor("#FFFFFF")
                    .setDescription("<:emoji_35:1477664716204540118> Agora para finalizar envie seu clipe");

                return msg.channel.send({
                    content: `<@${userId}>`,
                    embeds: [embedPasso3]
                });
            }

            // PASSO 3 - Recebe a Mídia, envia para o mural e fecha o canal
            if (step === "media") {
                if (msg.attachments.size === 0) {
                    const embedErro = new EmbedBuilder()
                        .setColor("#FFFFFF")
                        .setDescription("❌ Por favor, envie uma imagem ou vídeo para finalizar.");
                    
                    return msg.channel.send({
                        content: `<@${userId}>`,
                        embeds: [embedErro]
                    });
                }
                
                client.feedbackMedia[userId] = msg.attachments.first().url;

                db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [msg.guild.id], async (err, row) => {
                    
                    if (!row?.feedbackChannel) {
                        return msg.reply("❌ O canal oficial de feedback não foi configurado pelo administrador.");
                    }

                    const channel = msg.guild.channels.cache.get(row.feedbackChannel);

                    if (!channel) {
                        return msg.reply("❌ Canal oficial de feedbacks não encontrado.");
                    }

                    // A Embed que vai para o Mural Público (Mudei pra branco aqui também pra combinar com o padrão)
                    const embedFinal = new EmbedBuilder()
                        .setTitle("⭐ Novo Feedback")
                        .addFields(
                            {
                                name: "📱 Celular",
                                value: client.feedbackPhone[userId] || "Não informado",
                                inline: true
                            },
                            {
                                name: "💬 Feedback",
                                value: client.feedbackText[userId] || "Sem texto",
                                inline: false
                            }
                        )
                        .setThumbnail(msg.author.displayAvatarURL())
                        .setImage(client.feedbackMedia[userId])
                        .setColor("#FFFFFF") 
                        .setFooter({ text: `Enviado por: ${msg.author.tag}` });

                    await channel.send({ embeds: [embedFinal] });

                    await msg.channel.send("✅ Seu feedback foi enviado com sucesso! Fechando este canal em 3 segundos...");

                    // Limpa a memória para esse usuário poder abrir outro ticket depois
                    delete client.feedbackStep[userId];
                    delete client.feedbackMedia[userId];
                    delete client.feedbackPhone[userId];
                    delete client.feedbackText[userId];

                    setTimeout(() => {
                        msg.channel.delete().catch(console.error);
                    }, 3000);

                });
            }
        }
    });

}
