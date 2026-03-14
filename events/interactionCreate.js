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

    // IMAGENS PADRÃO ATUALIZADAS
    const imgPainelAdmin = "https://cdn.discordapp.com/attachments/1472254363274838018/1482253800596045844/IMG_2284.png?ex=69b647ed&is=69b4f66d&hm=9b9b85085794067991560fd3f092374720f955bd4005c69fe9094dc472caa91f&";
    const imgEmbedMembros = "https://cdn.discordapp.com/attachments/1472254363274838018/1482254045312979075/IMG_2281.png?ex=69b64827&is=69b4f6a7&hm=09260c3ef7b2fe6ce015255c3fdd0474b0bef37c9c3c2aaabb88fe792d4b8e3a&";
    
    const descPadrao = "<:emoji_40:1478558562010534088> Gostou Do nosso produto? Envie Seu **Feedback**";
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
                return threadChannel.send("❌ Canal oficial de feedbacks não encontrado.");
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

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("config_channels").setLabel("Canais").setEmoji("<:emoji_63:1482158321120051290>").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("config_role").setLabel("Cargo staff").setEmoji("<:emoji_3:1465361454269075720>").setStyle(ButtonStyle.Primary)
                    );

                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("config_embed_modal").setLabel("Configurar Aparência").setEmoji("<:emoji_62:1482158294649934017>").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("send_embed").setLabel("Enviar Embed").setEmoji("<a:emoji_60:1482141690721734776>").setStyle(ButtonStyle.Success)
                    );

                    return interaction.reply({ content: imgPainelAdmin, components: [row1, row2], ephemeral: true });
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
                    if (client.feedbackStep[userId] !== "media") return interaction.reply({ content: "❌ Etapa incorreta.", ephemeral: true });
                    await interaction.deferUpdate(); 
                    client.feedbackMedia[userId] = null;
                    await enviarFeedbackFinal(interaction.guild, interaction.user, interaction.channel, false);
                    return;
                }

                if (interaction.customId === "config_channels") {
                    const rowLogs = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("select_log_channel").setPlaceholder("Selecione o canal de LOGS internos").setChannelTypes(ChannelType.GuildText));
                    const rowFeedbacks = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("select_feedback_channel").setPlaceholder("Selecione o canal oficial de FEEDBACKS").setChannelTypes(ChannelType.GuildText));
                    return interaction.reply({ content: "📢 **Configuração de Canais:**", components: [rowLogs, rowFeedbacks], ephemeral: true });
                }

                if (interaction.customId === "config_role") {
                    const menu = new RoleSelectMenuBuilder().setCustomId("select_staff_role").setPlaceholder("Selecione o cargo da sua equipe (Staff)")
                    return interaction.reply({ content: "👥 Escolha o cargo Staff:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
                }

                if (interaction.customId === "config_embed_modal") {
                    const modal = new ModalBuilder().setCustomId("modal_config_submit").setTitle("Configurar Embed");
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_titulo").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_descricao").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_cor").setLabel("Cor HEX").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_imagem").setLabel("Link do Banner").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_emoji").setLabel("Emoji do Botão").setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === "send_embed") {
                    await interaction.deferReply({ ephemeral: true }); 
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        try {
                            let corFinal = row?.embedColor || "#FFFFFF";
                            const embed = new EmbedBuilder().setDescription(row?.embedDescription || descPadrao).setColor(corFinal.startsWith("#") ? corFinal : "#FFFFFF");
                            if (row?.embedTitle) embed.setTitle(row.embedTitle);
                            embed.setImage(row?.embedImage || imgEmbedMembros);
                            const button = new ButtonBuilder().setCustomId("start_feedback").setLabel(row?.buttonLabel || textoBtnPadrao).setStyle(ButtonStyle.Secondary);
                            try { button.setEmoji(row?.buttonEmoji || emojiBtnPadrao); } catch (e) { button.setEmoji("⭐"); }
                            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
                            return interaction.editReply({ content: "✅ Embed enviada!" });
                        } catch (e) { return interaction.editReply({ content: "❌ Erro ao montar embed." }); }
                    });
                }

                if (interaction.customId === "start_feedback") {
                    await interaction.deferReply({ ephemeral: true }); 
                    const user = interaction.user;
                    const threadNome = `💚-feedback-${user.username}`;
                    if (interaction.channel.threads.cache.find(c => c.name === threadNome) || client.feedbackStep[user.id]) return interaction.editReply({ content: `❌ Tópico já aberto!` });

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        const novoTopico = await interaction.channel.threads.create({ name: threadNome, autoArchiveDuration: 60, type: ChannelType.PrivateThread });
                        await novoTopico.members.add(user.id);
                        client.feedbackStep[user.id] = "phone";
                        const embedAviso = new EmbedBuilder().setColor("#FFFFFF").setDescription("<:emoji_67:1482232025363648652> Atenção ao enviar Seu feedback , Nao aceitamos foto como feedbacks!!");
                        const embedPasso1 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `informe seu celular`");
                        let mencao = `<@${user.id}>${row?.staffRole ? ` | <@&${row.staffRole}>` : ""}`;
                        await novoTopico.send({ content: mencao, embeds: [embedAviso, embedPasso1] });
                        return interaction.editReply({ content: `✅ Tópico criado: <#${novoTopico.id}>` });
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
                return interaction.reply({ content: "✅ Configurações salvas!", ephemeral: true });
            }

            /* ================= MENUS ================= */
            if (interaction.isChannelSelectMenu()) {
                const channelId = interaction.values[0];
                const isLog = interaction.customId === "select_log_channel";
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, isLog ? (row?.feedbackChannel || null) : channelId, isLog ? channelId : (row?.logChannel || null), row?.staffRole || null, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                });
                return interaction.reply({ content: `✅ Canal ${isLog ? "de Logs" : "de Feedbacks"} configurado!`, ephemeral: true });
            }

            if (interaction.isRoleSelectMenu() && interaction.customId === "select_staff_role") {
                const roleId = interaction.values[0];
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel || null, row?.logChannel || null, roleId, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                });
                return interaction.reply({ content: `✅ Staff configurada!`, ephemeral: true });
            }

        } catch (err) { console.error(err); }
    });

    /* =====================================================================
       EVENTO 2: MENSAGENS
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
                const rowPular = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("skip_video").setLabel("Enviar sem Vídeo").setEmoji("⏭️").setStyle(ButtonStyle.Secondary));
                return msg.channel.send({ content: `<@${userId}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776>  `Agora envie Seu Video `")], components: [rowPular] });
            }
            if (step === "media") {
                if (msg.attachments.size === 0) return msg.channel.send({ content: "❌ Envie um vídeo ou pule." });
                const anexo = msg.attachments.first();
                if (!anexo.contentType?.startsWith("video/")) return msg.channel.send({ content: "❌ Apenas vídeos são aceitos!" });
                client.feedbackMedia[userId] = anexo.url;
                await enviarFeedbackFinal(msg.guild, msg.author, msg.channel, true);
            }
        }
    });
}
