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

    // Garante que as colunas existam no banco de dados
    db.run(`ALTER TABLE config ADD COLUMN staffRole TEXT`, (err) => {});
    db.run(`ALTER TABLE config ADD COLUMN logChannel TEXT`, (err) => {});

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} 

    // === IMAGENS PADRÃO OFICIAIS ATUALIZADAS ===
    const imgPainelAdmin = "https://cdn.discordapp.com/attachments/1457915880481624094/1482256692346621993/IMG_2284.png?ex=69b64a9e&is=69b4f91e&hm=ffe04221aa793c16d05d59e5bdfae912da70dd1786e7ccc5e7d939d1bebb8b7f&";
    const imgEmbedMembros = "https://cdn.discordapp.com/attachments/1457915880481624094/1482256686008766495/IMG_2285.png?ex=69b64a9c&is=69b4f91c&hm=72a8f655d6bda7b99b1d48b7f0957bbc24731e2a8eaf27bc9c404892e78ee849&";
    
    const descPadrao = "<:emoji_40:1478558562010534088> Gostou Do nosso produto? Envie Seu **Feedback**";
    const emojiBtnPadrao = "<:emoji_65:1482230136538529942>";
    const textoBtnPadrao = "Enviar Feedback";

    const enviarFeedbackFinal = async (guild, author, threadChannel, hasVideo) => {
        const userId = author.id;

        db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [guild.id], async (err, row) => {
            if (!row?.feedbackChannel) return threadChannel.send("❌ O canal oficial de feedbacks não foi configurado!");

            const channel = guild.channels.cache.get(row.feedbackChannel);
            if (!channel) return threadChannel.send("❌ Canal oficial não encontrado.");

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

    client.on("interactionCreate", async interaction => {
        try {
            /* ================= SLASH COMMANDS ================= */
            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === "painel") {
                    if (!interaction.member.permissions.has("Administrator")) return interaction.reply({ content: "❌ Apenas administradores.", ephemeral: true });

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
                    if (!interaction.channel.isThread() || !interaction.channel.name.includes("feedback")) return interaction.reply({ content: "❌ Use apenas em tópicos de feedback.", ephemeral: true });
                    await interaction.reply("🔒 Fechando...");
                    setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
                }
            }

            /* ================= BOTÕES ================= */
            if (interaction.isButton()) {
                const userId = interaction.user.id;

                if (interaction.customId === "skip_video") {
                    await interaction.deferUpdate();
                    client.feedbackMedia[userId] = null;
                    await enviarFeedbackFinal(interaction.guild, interaction.user, interaction.channel, false);
                }

                if (interaction.customId === "config_channels") {
                    const row1 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("select_log_channel").setPlaceholder("Canal de LOGS").setChannelTypes(ChannelType.GuildText));
                    const row2 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("select_feedback_channel").setPlaceholder("Canal de FEEDBACKS").setChannelTypes(ChannelType.GuildText));
                    return interaction.reply({ content: "📢 Selecione os canais:", components: [row1, row2], ephemeral: true });
                }

                if (interaction.customId === "config_role") {
                    const menu = new RoleSelectMenuBuilder().setCustomId("select_staff_role").setPlaceholder("Selecione o cargo Staff");
                    return interaction.reply({ content: "👥 Escolha o cargo:", components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
                }

                if (interaction.customId === "config_embed_modal") {
                    const modal = new ModalBuilder().setCustomId("modal_config_submit").setTitle("Configurar Embed");
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_titulo").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_descricao").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_cor").setLabel("Cor HEX").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_imagem").setLabel("Banner").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("input_emoji").setLabel("Emoji do Botão").setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === "send_embed") {
                    await interaction.deferReply({ ephemeral: true });
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        let corFinal = row?.embedColor || "#FFFFFF";
                        const embed = new EmbedBuilder().setDescription(row?.embedDescription || descPadrao).setColor(corFinal.startsWith("#") ? corFinal : "#FFFFFF").setImage(row?.embedImage || imgEmbedMembros);
                        if (row?.embedTitle) embed.setTitle(row.embedTitle);
                        const btn = new ButtonBuilder().setCustomId("start_feedback").setLabel(row?.buttonLabel || textoBtnPadrao).setStyle(ButtonStyle.Secondary);
                        try { btn.setEmoji(row?.buttonEmoji || emojiBtnPadrao); } catch(e) { btn.setEmoji("⭐"); }
                        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
                        return interaction.editReply("✅ Enviado!");
                    });
                }

                if (interaction.customId === "start_feedback") {
                    await interaction.deferReply({ ephemeral: true });
                    const threadNome = `💚-feedback-${interaction.user.username}`;
                    if (interaction.channel.threads.cache.find(c => c.name === threadNome)) return interaction.editReply("❌ Tópico já aberto.");

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        const thread = await interaction.channel.threads.create({ name: threadNome, autoArchiveDuration: 60, type: ChannelType.PrivateThread });
                        await thread.members.add(interaction.user.id);
                        client.feedbackStep[interaction.user.id] = "phone";
                        const e1 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<:emoji_67:1482232025363648652> Atenção! Não aceitamos fotos.");
                        const e2 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `informe seu celular`");
                        await thread.send({ content: `<@${interaction.user.id}>${row?.staffRole ? ` | <@&${row.staffRole}>` : ""}`, embeds: [e1, e2] });
                        return interaction.editReply(`✅ Criado: <#${thread.id}>`);
                    });
                }
            }

            /* ================= MODAL & MENUS ================= */
            if (interaction.isModalSubmit() && interaction.customId === "modal_config_submit") {
                const t = interaction.fields.getTextInputValue("input_titulo") || null;
                const d = interaction.fields.getTextInputValue("input_descricao") || null;
                const c = interaction.fields.getTextInputValue("input_cor") || "#ffffff";
                const i = interaction.fields.getTextInputValue("input_imagem") || null;
                const e = interaction.fields.getTextInputValue("input_emoji") || null;
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel || null, row?.logChannel || null, row?.staffRole || null, t, d, c, i, e, textoBtnPadrao]);
                });
                return interaction.reply({ content: "✅ Salvo!", ephemeral: true });
            }

            if (interaction.isChannelSelectMenu()) {
                const cid = interaction.values[0];
                const isLog = interaction.customId === "select_log_channel";
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, isLog ? (row?.feedbackChannel || null) : cid, isLog ? cid : (row?.logChannel || null), row?.staffRole || null, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                });
                return interaction.reply({ content: "✅ Canal configurado!", ephemeral: true });
            }

            if (interaction.isRoleSelectMenu() && interaction.customId === "select_staff_role") {
                const rid = interaction.values[0];
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel || null, row?.logChannel || null, rid, row?.embedTitle || null, row?.embedDescription || null, row?.embedColor || null, row?.embedImage || null, row?.buttonEmoji || null, row?.buttonLabel || null]);
                });
                return interaction.reply({ content: "✅ Staff configurada!", ephemeral: true });
            }

        } catch (e) { console.error(e); }
    });

    client.on("messageCreate", async msg => {
        if (msg.author.bot || !msg.guild) return;
        const uid = msg.author.id;
        if (client.feedbackStep[uid] && msg.channel.isThread() && msg.channel.name.includes("feedback")) {
            const step = client.feedbackStep[uid];
            if (step === "phone") {
                client.feedbackPhone[uid] = msg.content;
                client.feedbackStep[uid] = "text";
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Agora Envie Seu Feedback`")] });
            }
            if (step === "text") {
                client.feedbackText[uid] = msg.content;
                client.feedbackStep[uid] = "media";
                const r = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("skip_video").setLabel("Enviar sem Vídeo").setEmoji("⏭️").setStyle(ButtonStyle.Secondary));
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Agora envie Seu Video`")], components: [r] });
            }
            if (step === "media") {
                if (msg.attachments.size === 0) return msg.channel.send("❌ Envie um vídeo ou pule.");
                const a = msg.attachments.first();
                if (!a.contentType?.startsWith("video/")) return msg.channel.send("❌ Apenas vídeos!");
                client.feedbackMedia[uid] = a.url;
                await enviarFeedbackFinal(msg.guild, msg.author, msg.channel, true);
            }
        }
    });
}
