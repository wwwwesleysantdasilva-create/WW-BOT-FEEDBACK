import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from "discord.js"

import db from "../database/db.js"

export default (client) => {

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    // Nota: Removi o client.editState pois não precisaremos mais dele para a embed! Tudo vai pelo Modal.

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
            // Adicionando a imagem fixa do painel que você enviou:
            .setImage("https://cdn.discordapp.com/attachments/1457915880481624094/1481517561253466213/IMG_2135.jpg?ex=69b5947f&is=69b442ff&hm=76eee3dcea3d75d1afe09d0ee20faa41c36fc216b8b1ce4e4775283cc275f2e3&");

        const row1 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId("config_channel")
                .setLabel("Canal Feedback")
                .setEmoji("<:emoji_63:1482158321120051290>") // Emoji customizado
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId("config_embed_modal")
                .setLabel("Configurar Aparência")
                .setEmoji("<:emoji_62:1482158294649934017>") // Emoji customizado
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId("send_embed")
                .setLabel("Enviar Embed")
                .setEmoji("<a:emoji_60:1482141690721734776>") // Emoji customizado animado
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
                    })

                }

                // === AQUI ESTÁ A CRIAÇÃO DO MODAL ===
                if (interaction.customId === "config_embed_modal") {

                    const modal = new ModalBuilder()
                        .setCustomId("modal_config_submit")
                        .setTitle("Configurar Embed");

                    // 1. Campo de Texto (Título | Descrição)
                    const textInput = new TextInputBuilder()
                        .setCustomId("input_texto")
                        .setLabel("Título | Descrição")
                        .setPlaceholder("Ex: Meu Título | Minha descrição aqui...")
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(false);

                    // 2. Campo de Imagem (URL)
                    const imageInput = new TextInputBuilder()
                        .setCustomId("input_imagem")
                        .setLabel("Link da Imagem")
                        .setPlaceholder("Ex: https://meusite.com/imagem.png")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    // 3. Campo de Cor (HEX)
                    const colorInput = new TextInputBuilder()
                        .setCustomId("input_cor")
                        .setLabel("Cor HEX")
                        .setPlaceholder("Ex: #ffffff")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    // 4. Campo de Botão (Emoji | Texto)
                    const buttonInput = new TextInputBuilder()
                        .setCustomId("input_botao")
                        .setLabel("Botão (Emoji | Texto)")
                        .setPlaceholder("Ex: ⭐ | Enviar Feedback")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    // O Discord exige que cada TextInput fique dentro de sua própria ActionRow
                    const row1 = new ActionRowBuilder().addComponents(textInput);
                    const row2 = new ActionRowBuilder().addComponents(imageInput);
                    const row3 = new ActionRowBuilder().addComponents(colorInput);
                    const row4 = new ActionRowBuilder().addComponents(buttonInput);

                    modal.addComponents(row1, row2, row3, row4);

                    // Mostra o formulário para o usuário
                    return interaction.showModal(modal);

                }

                if (interaction.customId === "send_embed") {

                    db.get(`SELECT * FROM config WHERE guild=?`,
                        [interaction.guild.id],
                        async (_, row) => {

                            const embed = new EmbedBuilder()
                                .setTitle(row?.embedTitle || "⭐ Envie seu Feedback")
                                .setDescription(row?.embedDescription || "Clique no botão abaixo.")
                                .setColor(row?.embedColor || "#FFFFFF")
                                
                            if (row?.embedImage) embed.setImage(row.embedImage);

                            const button = new ButtonBuilder()
                                .setCustomId("start_feedback")
                                .setLabel(row?.buttonLabel || "Enviar Feedback")
                                .setEmoji(row?.buttonEmoji || "⭐")
                                .setStyle(ButtonStyle.Primary)

                            const rowBtn = new ActionRowBuilder().addComponents(button)

                            await interaction.channel.send({
                                embeds: [embed],
                                components: [rowBtn]
                            })

                            interaction.reply({
                                content: "✅ Embed enviada!",
                                ephemeral: true
                            })

                        })

                }

                if (interaction.customId === "start_feedback") {

                    client.feedbackStep[userId] = "media"

                    return interaction.reply({
                        content: "📷 Envie uma imagem ou vídeo do resultado.",
                        ephemeral: true
                    })

                }

            }

            /* ================= RECEBENDO O MODAL ================= */

            if (interaction.isModalSubmit()) {
                
                if (interaction.customId === "modal_config_submit") {
                    
                    // Pegando os valores que o usuário digitou
                    const textoRaw = interaction.fields.getTextInputValue("input_texto");
                    const imagem = interaction.fields.getTextInputValue("input_imagem");
                    const cor = interaction.fields.getTextInputValue("input_cor");
                    const botaoRaw = interaction.fields.getTextInputValue("input_botao");

                    // Tratando a lógica de " | " para Título e Descrição
                    let titulo = "⭐ Envie seu Feedback";
                    let descricao = "Clique no botão abaixo.";
                    if (textoRaw) {
                        const partes = textoRaw.split("|").map(p => p.trim());
                        titulo = partes[0] || titulo;
                        descricao = partes[1] || descricao;
                    }

                    // Tratando a lógica de " | " para o Botão
                    let emojiBotao = "⭐";
                    let textoBotao = "Enviar Feedback";
                    if (botaoRaw) {
                        const partes = botaoRaw.split("|").map(p => p.trim());
                        emojiBotao = partes[0] || emojiBotao;
                        textoBotao = partes[1] || textoBotao;
                    }

                    // ⚠️ ATENÇÃO: Substitua essa query pela sua lógica de UPDATE correta do banco.
                    // Dependendo de como sua tabela "config" está feita, um INSERT OR REPLACE 
                    // pode apagar o "feedbackChannel" se ele não for passado novamente.
                    db.run(
                        `INSERT OR REPLACE INTO config (guild, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) 
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, titulo, descricao, cor || "#ffffff", imagem || null, emojiBotao, textoBotao]
                    );

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

                    db.run(
                        `INSERT OR REPLACE INTO config (guild,feedbackChannel)
                         VALUES (?,?)`,
                        [interaction.guild.id, channelId]
                    )

                    return interaction.reply({
                        content: `✅ Canal configurado: <#${channelId}>`,
                        ephemeral: true
                    })

                }

            }

        } catch (err) {
            console.error("Erro interaction:", err)
        }

    })

}
