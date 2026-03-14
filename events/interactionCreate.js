import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} from "discord.js"

import db from "../database/db.js"

export default (client) => {

    // =====================================================================
    // CORREÇÃO AUTOMÁTICA DO BANCO DE DADOS
    // Isso garante que a coluna staffRole exista e o bot não trave ao salvar
    // =====================================================================
    db.run(`ALTER TABLE config ADD COLUMN staffRole TEXT`, (err) => {
        // Ignora o erro silenciosamente caso a coluna já exista no banco
    });

    // Memória temporária para o sistema de tickets
    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} 

    // Valores Padrão da Embed
    const descPadrao = "<:emoji_40:1478558562010534088> Gostou Do nosso produto? Envie Seu **Feedback**";
    const imgPadrao = "https://cdn.discordapp.com/attachments/1457915880481624094/1482229903083704391/IMG_2274.jpg?ex=69b631ab&is=69b4e02b&hm=5b888d89f1cc42cec6a695ef828b45c1870a3bd16e7074e0228ae71e88c7878d&";
    const emojiBtnPadrao = "<:emoji_65:1482230136538529942>";
    const textoBtnPadrao = "Enviar Feedback";

    /* =====================================================================
       EVENTO 1: INTERAÇÕES (Comandos, Botões, Menus e Modais)
       ===================================================================== */
    client.on("interactionCreate", async interaction => {

        try {
            /* ================= SLASH COMMANDS ================= */
            if (interaction.isChatInputCommand()) {
                
                // COMANDO: /painel
                if (interaction.commandName === "painel") {

                    if (!interaction.member.permissions.has("Administrator")) {
                        return interaction.reply({
                            content: "❌ Apenas administradores podem usar este painel.",
                            ephemeral: true
                        });
                    }

                    const imagemPainel = "https://cdn.discordapp.com/attachments/1457915880481624094/1481517561253466213/IMG_2135.jpg?ex=69b5947f&is=69b442ff&hm=76eee3dcea3d75d1afe09d0ee20faa41c36fc216b8b1ce4e4775283cc275f2e3&";

                    // Fileira 1: Configurações do Sistema (Canal e Staff atualizados)
                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("config_channel")
                            .setLabel("Canal de logs")
                            .setEmoji("<:emoji_63:1482158321120051290>")
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId("config_role")
                            .setLabel("Cargo staff")
                            .setEmoji("<:emoji_3:1465361454269075720>")
                            .setStyle(ButtonStyle.Primary)
                    );

                    // Fileira 2: Embed e Envio
                    const row2 = new ActionRowBuilder().addComponents(
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
                        components: [row1, row2],
                        ephemeral: true
                    });
                }

                // COMANDO: /fechar
                if (interaction.commandName === "fechar") {
                    if (!interaction.channel.isThread() || !interaction.channel.name.includes("feedback")) {
                        return interaction.reply({ 
                            content: "❌ Este comando só pode ser usado dentro de um tópico de feedback.", 
                            ephemeral: true 
                        });
                    }
                    await interaction.reply("🔒 Fechando este tópico em 3 segundos...");
                    
                    setTimeout(() => {
                        interaction.channel.delete().catch(console.error);
                    }, 3000);
                    return;
                }
            }

            /* ================= BOTÕES ================= */
            if (interaction.isButton()) {

                const userId = interaction.user.id

                if (interaction.customId === "config_channel") {
                    const menu = new ChannelSelectMenuBuilder()
                        .setCustomId("select_feedback_channel")
                        .setPlaceholder("Selecione o canal de logs dos feedbacks")
                        .setChannelTypes(ChannelType.GuildText)

                    const row = new ActionRowBuilder().addComponents(menu)

                    return interaction.reply({
                        content: "📢 Escolha o canal onde os feedbacks aprovados serão enviados:",
                        components: [row],
                        ephemeral: true
                    });
                }

                if (interaction.customId === "config_role") {
                    const menu = new RoleSelectMenuBuilder()
                        .setCustomId("select_staff_role")
                        .setPlaceholder("Selecione o cargo da sua equipe (Staff)")

                    const row = new ActionRowBuilder().addComponents(menu)

                    return interaction.reply({
                        content: "👥 Escolha qual cargo será notificado quando um novo feedback for aberto:",
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
                        .setLabel("Título (Deixe vazio para o padrão)")
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false);

                    const descInput = new TextInputBuilder()
                        .setCustomId("input_descricao")
                        .setLabel("Descrição")
                        .setPlaceholder("Ex: Gostou do produto? Envie seu feedback!")
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
                        .setLabel("Link da Imagem (Banner)")
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
                                .setDescription(row?.embedDescription || descPadrao)
                                .setColor(corFinal);
                                
                            if (row?.embedTitle) embed.setTitle(row.embedTitle);

                            let imagemFinal = row?.embedImage || imgPadrao;
                            if (imagemFinal && imagemFinal.startsWith("http")) {
                                embed.setImage(imagemFinal);
                            }

                            const button = new ButtonBuilder()
                                .setCustomId("start_feedback")
                                .setLabel(row?.buttonLabel || textoBtnPadrao)
                                .setStyle(ButtonStyle.Secondary);

                            try {
                                if (row?.buttonEmoji) {
                                    button.setEmoji(row.buttonEmoji);
                                } else {
                                    button.setEmoji(emojiBtnPadrao);
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
                                content: "❌ Ocorreu um erro ao montar a Embed. Verifique as configurações.",
                                ephemeral: true
                            });
                        }
                    });
                }

                // === INÍCIO DO SISTEMA DE TÓPICO PRIVADO ===
                if (interaction.customId === "start_feedback") {
                    const user = interaction.user;
                    const guild = interaction.guild;

                    const threadNome = `💚-feedback-${user.username}`;
                    const canalExistente = interaction.channel.threads.cache.find(c => c.name === threadNome);
                    
                    if (canalExistente || client.feedbackStep[user.id]) {
                        return interaction.reply({
                            content: `❌ Você já tem um tópico de feedback aberto!`,
                            ephemeral: true
                        });
                    }

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [guild.id], async (err, row) => {
                        
                        const novoTopico = await interaction.channel.threads.create({
                            name: threadNome,
                            autoArchiveDuration: 60,
                            type: ChannelType.PrivateThread, 
                            reason: `Ticket de feedback para ${user.username}`
                        });

                        await novoTopico.members.add(user.id);

                        // Exibe apenas o comando /fechar para o usuário, de forma invisível para os outros
                        interaction.reply({
                            content: `✅ Tópico criado! Vá para <#${novoTopico.id}> para iniciar.\n*(Para cancelar ou fechar o atendimento a qualquer momento, digite o comando \`/fechar\` dentro do tópico)*`,
                            ephemeral: true
                        });

                        client.feedbackStep[user.id] = "phone";

                        const embedPasso1 = new EmbedBuilder()
                            .setColor("#FFFFFF")
                            .setDescription("<:emoji_35:1477664716204540118> Informe Seu Celular");

                        // Botão foi removido daqui! Fica apenas a marcação e a instrução
                        let msgMencionando = `<@${user.id}>`;
                        if (row?.staffRole) {
                            msgMencionando += ` | <@&${row.staffRole}>`;
                        }

                        return novoTopico.send({
                            content: msgMencionando, 
                            embeds: [embedPasso1]
                        });
                    });
                }
            }

            /* ================= RECEBENDO O MODAL ================= */
            if (interaction.isModalSubmit()) {
                if (interaction.customId === "modal_config_submit") {
                    
                    const titulo = interaction.fields.getTextInputValue("input_titulo") || null;
                    const descricao = interaction.fields.getTextInputValue("input_descricao") || null;
                    const cor = interaction.fields.getTextInputValue("input_cor") || "#ffffff";
                    const imagem = interaction.fields.getTextInputValue("input_imagem") || null;
                    const emojiBotao = interaction.fields.getTextInputValue("input_emoji") || null;

                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) 
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                row?.feedbackChannel || null, 
                                row?.staffRole || null,
                                titulo, 
                                descricao, 
                                cor, 
                                imagem, 
                                emojiBotao, 
                                textoBtnPadrao
                            ]
                        );
                    });

                    return interaction.reply({
                        content: "✅ Cores, textos e imagens atualizados com sucesso! Tente clicar em **Enviar Embed** agora.",
                        ephemeral: true
                    });
                }
            }

            /* ================= MENUS (Canal e Cargo) ================= */
            
            // Tratamento corrigido para o Menu de Canais e Cargos
            if (interaction.isAnySelectMenu()) {
                
                if (interaction.customId === "select_feedback_channel") {
                    const channelId = interaction.values[0]
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                channelId,
                                row?.staffRole || null,
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
                        content: `✅ Canal de Logs configurado: <#${channelId}>`,
                        ephemeral: true
                    });
                }

                if (interaction.customId === "select_staff_role") {
                    const roleId = interaction.values[0]
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(
                            `INSERT OR REPLACE INTO config (guild, feedbackChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                interaction.guild.id, 
                                row?.feedbackChannel || null,
                                roleId,
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
                        content: `✅ Cargo Staff configurado: <@&${roleId}>. Eles serão notificados nos novos tickets.`,
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

        if (client.feedbackStep[userId] && msg.channel.isThread() && msg.channel.name.includes("feedback")) {

            const step = client.feedbackStep[userId];

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

                    await msg.channel.send("✅ Seu feedback foi enviado com sucesso! Fechando este tópico em 3 segundos...");

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
