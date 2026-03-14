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

    // Inicializando os objetos na memória do bot para os passos
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

                    const embed = new EmbedBuilder()
                        .setTitle("⚙️ Painel de Controle")
                        .setDescription("Gerencie o sistema de feedback do servidor.")
                        .setColor("#FFFFFF")
                        .setImage("https://cdn.discordapp.com/attachments/1457915880481624094/1481517561253466213/IMG_2135.jpg?ex=69b5947f&is=69b442ff&hm=76eee3dcea3d75d1afe09d0ee20faa41c36fc216b8b1ce4e4775283cc275f2e3&");

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
                        embeds: [embed],
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
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (_, row) => {
                        const embed = new EmbedBuilder()
                            .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
                            .setDescription(row?.embedDescription || "Clique no botão abaixo.")
                            .setColor(row?.embedColor || "#FFFFFF");
                            
                        if (row?.embedImage) embed.setImage(row.embedImage);

                        const button = new ButtonBuilder()
                            .setCustomId("start_feedback")
                            .setLabel(row?.buttonLabel || "Enviar Feedback")
                            .setEmoji(row?.buttonEmoji || "⭐")
                            .setStyle(ButtonStyle.Primary);

                        const rowBtn = new ActionRowBuilder().addComponents(button);

                        await interaction.channel.send({
                            embeds: [embed],
                            components: [rowBtn]
                        });

                        interaction.reply({
                            content: "✅ Embed enviada!",
                            ephemeral: true
                        });
                    });
                }

                // Quando o membro clica para Iniciar o Feedback
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

                    // Cria o canal temporário
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

                    // Define o primeiro passo do formulário do membro
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
                        content: "✅ Cores, textos e imagens atualizados com sucesso!",
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

        // O bot só vai escutar o passo a passo se a mensagem for enviada no ticket daquele usuário
        if (msg.channel.name === `feedback-${userId}`) {

            const step = client.feedbackStep[userId];

            /* PASSO 1 - MIDIA */
            if (step === "media") {
                if (msg.attachments.size === 0) {
                    return msg.reply("❌ Por favor, envie uma imagem ou vídeo para continuar.");
                }
                client.feedbackMedia[userId] = msg.attachments.first().url;
                client.feedbackStep[userId] = "phone";
                return msg.reply("📱 **Passo 2:** Qual modelo do celular você usa?\nEx: iPhone 12 / Redmi Note 11");
            }

            /* PASSO 2 - CELULAR */
            if (step === "phone") {
                client.feedbackPhone[userId] = msg.content;
                client.feedbackStep[userId] = "text";
                return msg.reply("💬 **Passo 3:** Agora escreva seu feedback detalhado.");
            }

            /* PASSO 3 - FEEDBACK FINAL */
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

                    // Monta a sua Embed original com os dados coletados
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

                    // Envia para o canal oficial
                    await channel.send({ embeds: [embed] });

                    // Avisa o membro
                    await msg.reply("✅ Feedback enviado com sucesso! Este canal será fechado em 3 segundos...");

                    // Limpa a memória
                    delete client.feedbackStep[userId];
                    delete client.feedbackMedia[userId];
                    delete client.feedbackPhone[userId];

                    // Apaga o ticket
                    setTimeout(() => {
                        msg.channel.delete().catch(console.error);
                    }, 3000);

                });
            }
        }
    });

}
