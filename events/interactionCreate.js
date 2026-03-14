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

    db.run(`ALTER TABLE config ADD COLUMN staffRole TEXT`, (err) => {});
    db.run(`ALTER TABLE config ADD COLUMN logChannel TEXT`, (err) => {});

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} 

    const descPadrao = "<:emoji_40:1478558562010534088> Gostou Do nosso produto? Envie Seu **Feedback**";
    const imgPadrao = "https://cdn.discordapp.com/attachments/1457915880481624094/1482229903083704391/IMG_2274.jpg?ex=69b631ab&is=69b4e02b&hm=5b888d89f1cc42cec6a695ef828b45c1870a3bd16e7074e0228ae71e88c7878d&";
    const emojiBtnPadrao = "<:emoji_65:1482230136538529942>";
    const textoBtnPadrao = "Enviar Feedback";

    // FUNÇÃO AUXILIAR PARA ENVIAR O FEEDBACK FINAL
    const enviarFeedbackFinal = async (guild, author, threadChannel, hasVideo) => {
        const userId = author.id;

        db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [guild.id], async (err, row) => {
            if (!row?.feedbackChannel) {
                return threadChannel.send("❌ O canal oficial de feedbacks não foi configurado no painel!");
            }

            const channel = guild.channels.cache.get(row.feedbackChannel);
            if (!channel) {
                return threadChannel.send("❌ Canal oficial de feedbacks não encontrado. Ele pode ter sido apagado.");
            }

            const embedFinal = new EmbedBuilder()
                .setTitle("⭐ Novo Feedback")
                .addFields(
                    { name: "📱 Celular", value: client.feedbackPhone[userId] || "Não informado", inline: true },
                    { name: "💬 Feedback", value: client.feedbackText[userId] || "Sem texto", inline: false }
                )
                .setThumbnail(author.displayAvatarURL())
                .setColor("#FFFFFF") 
                .setFooter({ text: `Enviado por: ${author.tag}` });

            const conteudoVideo = (hasVideo && client.feedbackMedia[userId]) ? client.feedbackMedia[userId] : null;

            await channel.send({ content: conteudoVideo, embeds: [embedFinal] });

            await threadChannel.send("✅ Seu feedback foi enviado com sucesso! Fechando este tópico em 3 segundos...");

            delete client.feedbackStep[userId];
            delete client.feedbackMedia[userId];
            delete client.feedbackPhone[userId];
            delete client.feedbackText[userId];

            setTimeout(() => threadChannel.delete().catch(console.error), 3000);
        });
    };

    /* =====================================================================
       EVENTO 1: INTERAÇÕES (Comandos, Botões, Menus e Modais)
       ===================================================================== */
    client.on("interactionCreate", async interaction => {

        try {
            /* ================= SLASH COMMANDS ================= */
            if (interaction.isChatInputCommand()) {
                
                if (interaction.commandName === "painel") {
                    if (!interaction.member.permissions.has("Administrator")) {
                        return interaction.reply({ content: "❌ Apenas administradores.", ephemeral: true });
                    }

                    const imagemPainel = "https://cdn.discordapp.com/attachments/1457915880481624094/1481517561253466213/IMG_2135.jpg?ex=69b5947f&is=69b442ff&hm=76eee3dcea3d75d1afe09d0ee20faa41c36fc216b8b1ce4e4775283cc275f2e3&";

                    // Fileira 1 atualizada: O botão "Canais" agora substitui os dois antigos de canais.
                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("config_channels").setLabel("Canais").setEmoji("<:emoji_63:1482158321120051290>").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("config_role").setLabel("Cargo staff").setEmoji("<:emoji_3:1465361454269075720>").setStyle(ButtonStyle.Primary)
                    );

                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("config_embed_modal").setLabel("Configurar Aparência").setEmoji("<:emoji_62:1482158294649934017>").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("send_embed").setLabel("Enviar Embed").setEmoji("<a:emoji_60:1482141690721734776>").setStyle(ButtonStyle.Success)
                    );

                    return interaction.reply({ content: imagemPainel, components: [row1, row2], ephemeral: false });
                }

                if (interaction.commandName === "fechar") {
                    if (!interaction.channel.isThread() || !interaction.channel.name.includes("feedback")) {
                        return interaction.reply({ content: "❌ Use apenas dentro de um tópico de feedback.", ephemeral: true });
                    }
                    await interaction.reply("🔒 Fechando este tópico em 3 segundos...");
                    setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
                    return;
                }
            }

            /* ================= BOTÕES ================= */
            if (interaction.isButton()) {

                const userId = interaction.user.id

                if (interaction.customId === "skip_video") {
                    if (client.feedbackStep[userId] !== "media") {
                        return interaction.reply({ content: "❌ Você já enviou o feedback ou não está na etapa correta.", ephemeral: true });
                    }
                    await interaction.deferUpdate(); 
                    client.feedbackMedia[userId] = null;
                    await enviarFeedbackFinal(interaction.guild, interaction.user, interaction.channel, false);
                    return;
                }

                // NOVO BOTÃO DE CANAIS (Abre os dois menus juntos)
                if (interaction.customId === "config_channels") {
                    const menuLogs = new ChannelSelectMenuBuilder()
                        .setCustomId("select_log_channel")
                        .setPlaceholder("Selecione o canal de LOGS internos")
                        .setChannelTypes(ChannelType.GuildText);
                        
                    const menuFeedbacks = new ChannelSelectMenuBuilder()
                        .setCustomId("select_feedback_channel")
                        .setPlaceholder("Selecione o canal oficial de FEEDBACKS")
                        .setChannelTypes(ChannelType.GuildText);

                    const rowLogs = new ActionRowBuilder().addComponents(menuLogs);
                    const rowFeedbacks = new ActionRowBuilder().addComponents(menuFeedbacks);

                    return interaction.reply({ 
                        content: "📢 **Configuração de Canais:**\nSelecione abaixo o canal onde os Logs serão salvos e o canal onde os Feedbacks serão postados.", 
                        components: [rowLogs, rowFeedbacks], 
                        ephemeral: true 
                    });
                }

                if (interaction.customId === "config_role") {
                    const menu = new RoleSelectMenuBuilder().setCustomId("select_staff_role").setPlaceholder("Selecione o cargo da sua equipe (Staff)")
                    return interaction.reply({ content: "👥 Escolha qual cargo será notificado:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
                }

                if (interaction.customId === "config_embed_modal") {
                    const modal = new ModalBuilder().setCustomId("modal_config_submit").setTitle("Configurar Embed");
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_titulo").setLabel("Título (Deixe vazio para o padrão)").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_descricao").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_cor").setLabel("Cor HEX").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_imagem").setLabel("Link da Imagem (Banner)").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_emoji").setLabel("Emoji do Botão").setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === "send_embed") {
                    await interaction.deferReply({ ephemeral: true }); 

                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        try {
                            let corFinal = row?.embedColor || "#FFFFFF";
                            if (!corFinal.startsWith("#")) corFinal = "#FFFFFF";

                            const embed = new EmbedBuilder().setDescription(row?.embedDescription || descPadrao).setColor(corFinal);
                            if (row?.embedTitle) embed.setTitle(row.embedTitle);
                            
                            let imagemFinal = row?.embedImage || imgPadrao;
                            if (imagemFinal && imagemFinal.startsWith("http")) embed.setImage(imagemFinal);

                            const button = new ButtonBuilder().setCustomId("start_feedback").setLabel(row?.buttonLabel || textoBtnPadrao).setStyle(ButtonStyle.Secondary);
                            try { button.setEmoji(row?.buttonEmoji || emojiBtnPadrao); } catch (e) { button.setEmoji("⭐"); }

                            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
                            return interaction.editReply({ content: "✅ Embed enviada com sucesso no chat!" });

                        } catch (erroEmbed) {
                            console.error(erroEmbed);
                            return interaction.editReply({ content: "❌ Ocorreu um erro ao montar a Embed." });
                        }
                    });
                }

                if (interaction.customId === "start_feedback") {
                    await interaction.deferReply({ ephemeral: true }); 

                    const user = interaction.user;
                    const guild = interaction.guild;
                    const threadNome = `💚-feedback-${user.username}`;
                    
                    if (interaction.channel.threads.cache.find(c => c.name === threadNome) || client.feedbackStep[user.id]) {
                        return interaction.editReply({ content: `❌ Você já tem um tópico aberto!` });
                    }

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [guild.id], async (err, row) => {
                        const novoTopico = await interaction.channel.threads.create({
                            name: threadNome,
                            autoArchiveDuration: 60,
                            type: ChannelType.PrivateThread
                        });

                        await novoTopico.members.add(user.id);
                        
                        client.feedbackStep[user.id] = "phone";

                        const embedAviso = new EmbedBuilder().setColor("#FFFFFF").setDescription("<:emoji_67:1482232025363648652> Atenção ao enviar Seu feedback , Nao aceitamos foto como feedbacks!!");
                        const embedPasso1 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `informe seu celular`");

                        let msgMencionando = `<@${user.id}>`;
                        if (row?.staffRole) msgMencionando += ` | <@&${row.staffRole}>`;

                        await novoTopico.send({ content: msgMencionando, embeds: [embedAviso, embedPasso1] });
                        return interaction.editReply({ content: `✅ Tópico criado! Vá para <#${novoTopico.id}> para iniciar.` });
                    });
                }
            }

            /* ================= RECEBENDO O MODAL ================= */
            if (interaction.isModalSubmit() && interaction.customId === "modal_config_submit") {
                const titulo = interaction.fields.getTextInputValue("input_titulo") || null;
                const descricao = interaction.fields.getTextInputValue("input_descricao") || null;
                const cor = interaction.fields.getTextInputValue("input_cor") || "#ffffff";
                const imagem = interaction.fields.getTextInputValue("input_imagem") || null;
                const emojiBotao = interaction.fields.getTextInputValue("input_emoji") || null;

                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel || null, row?.logChannel || null, row?.staffRole || null, titulo, descricao, cor, imagem, emojiBotao, textoBtnPadrao]);
                });
                return interaction.reply({ content: "✅ Configurações atualizadas!", ephemeral: true });
            }

            /* ================= MENUS (Canal e Cargo) ================= */
            if (interaction.isChannelSelectMenu()) {
                
                if (interaction.customId === "select_log_channel") {
                    const channelId = interaction.values[0]
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [interaction.guild.id, row?.feedbackChannel || null, channelId, row?.staffRole || null, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                    });
                    return interaction.reply({ content: `✅ Canal de Logs configurado: <#${channelId}>`, ephemeral: true });
                }

                if (interaction.customId === "select_feedback_channel") {
                    const channelId = interaction.values[0]
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [interaction.guild.id, channelId, row?.logChannel || null, row?.staffRole || null, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                    });
                    return interaction.reply({ content: `✅ Canal de Feedbacks configurado: <#${channelId}>`, ephemeral: true });
                }
            }

            if (interaction.isRoleSelectMenu()) {
                if (interaction.customId === "select_staff_role") {
                    const roleId = interaction.values[0]
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                        db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [interaction.guild.id, row?.feedbackChannel || null, row?.logChannel || null, roleId, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                    });
                    return interaction.reply({ content: `✅ Cargo Staff configurado: <@&${roleId}>`, ephemeral: true });
                }
            }

        } catch (err) {
            console.error(err)
        }
    });

    /* =====================================================================
       EVENTO 2: MENSAGENS (Passo a passo dentro do Ticket)
       ===================================================================== */
    client.on("messageCreate", async msg => {
        if (msg.author.bot || !msg.guild) return;
        const userId = msg.author.id;

        if (client.feedbackStep[userId] && msg.channel.isThread() && msg.channel.name.includes("feedback")) {
            const step = client.feedbackStep[userId];

            if (step === "phone") {
                client.feedbackPhone[userId] = msg.content;
                client.feedbackStep[userId] = "text";
                return msg.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Agora Envie Seu Feedback`")] });
            }

            if (step === "text") {
                client.feedbackText[userId] = msg.content;
                client.feedbackStep[userId] = "media";
                
                const embedPasso3 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776>  `Agora envie Seu Video `\n\n*(Se não tiver vídeo, você pode finalizar apenas clicando no botão abaixo)*");
                
                const rowPular = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("skip_video").setLabel("Enviar sem Vídeo").setEmoji("⏭️").setStyle(ButtonStyle.Secondary)
                );

                return msg.channel.send({ content: `<@${userId}>`, embeds: [embedPasso3], components: [rowPular] });
            }

            if (step === "media") {
                if (msg.attachments.size === 0) {
                    return msg.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder().setColor("#ff0000").setDescription("❌ Por favor, envie um **arquivo de vídeo** ou clique no botão 'Enviar sem Vídeo'.")] });
                }
                
                const anexo = msg.attachments.first();
                
                if (!anexo.contentType || !anexo.contentType.startsWith("video/")) {
                    return msg.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder().setColor("#ff0000").setDescription("❌ Não aceitamos fotos! Por favor, envie apenas um **vídeo** ou clique no botão 'Enviar sem Vídeo'.")] });
                }

                client.feedbackMedia[userId] = anexo.url;
                await enviarFeedbackFinal(msg.guild, msg.author, msg.channel, true);
            }
        }
    });
}
