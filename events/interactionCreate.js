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

    db.serialize(() => {
        db.run(`ALTER TABLE config ADD COLUMN staffRole TEXT`, (err) => {});
        db.run(`ALTER TABLE config ADD COLUMN logChannel TEXT`, (err) => {});
    });

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} 

    // Links limpos para garantir o carregamento
    const IMG_PAINEL_CONTROL = "https://cdn.discordapp.com/attachments/1457915880481624094/1482260307228364860/IMG_2287.png";
    const IMG_FEEDBACK_PADRAO = "https://cdn.discordapp.com/attachments/1457915880481624094/1482259209054715924/IMG_2286.jpg";
    
    const TEXTO_FEEDBACK_PADRAO = "** Bem Vindo ao painel De feedbacks **\n\n<:emoji_40:1478558562010534088> Caso queira deixar um **Feedback** Clique no botão abaixo !";
    const EMOJI_BTN_PADRAO = "<:emoji_65:1482230136538529942>";
    const TEXTO_BTN_PADRAO = "Enviar Feedback";

    const finalizarFeedback = async (guild, author, thread, temVideo) => {
        const userId = author.id;
        db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [guild.id], async (err, row) => {
            if (!row?.feedbackChannel) return thread.send("❌ Canal de feedbacks não configurado.");
            const canalAlvo = guild.channels.cache.get(row.feedbackChannel);
            if (!canalAlvo) return thread.send("❌ Canal não encontrado.");

            const embedFinal = new EmbedBuilder()
                .setTitle("⭐ Novo Feedback")
                .addFields(
                    { name: "📱 Celular", value: client.feedbackPhone[userId] || "Não informado", inline: true },
                    { name: "💬 Feedback", value: client.feedbackText[userId] || "Sem texto", inline: false }
                )
                .setThumbnail(author.displayAvatarURL())
                .setColor("#FFFFFF")
                .setFooter({ text: `Usuário: ${author.tag}` });

            const midia = (temVideo && client.feedbackMedia[userId]) ? client.feedbackMedia[userId] : null;
            await canalAlvo.send({ content: midia, embeds: [embedFinal] });
            await thread.send("✅ Enviado com sucesso! Fechando em 3s...");

            delete client.feedbackStep[userId]; delete client.feedbackMedia[userId];
            delete client.feedbackPhone[userId]; delete client.feedbackText[userId];
            setTimeout(() => thread.delete().catch(() => {}), 3000);
        });
    };

    client.on("interactionCreate", async interaction => {
        try {
            if (interaction.isChatInputCommand() && interaction.commandName === "painel") {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });

                const r1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_canais").setLabel("Canais").setEmoji("<:emoji_63:1482158321120051290>").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("btn_staff").setLabel("Cargo staff").setEmoji("<:emoji_3:1465361454269075720>").setStyle(ButtonStyle.Primary)
                );
                const r2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("btn_aparencia").setLabel("Configurar Aparência").setEmoji("<:emoji_62:1482158294649934017>").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("btn_enviar").setLabel("Enviar Embed").setEmoji("<a:emoji_60:1482141690721734776>").setStyle(ButtonStyle.Success)
                );

                // ENVIANDO COMO TEXTO (IGUAL AOS PRIMEIROS CÓDIGOS)
                return interaction.reply({ 
                    content: IMG_PAINEL_CONTROL, 
                    components: [r1, r2], 
                    ephemeral: true 
                });
            }

            if (interaction.isButton()) {
                const uid = interaction.user.id;

                if (interaction.customId === "skip_video") {
                    await interaction.deferUpdate();
                    await finalizarFeedback(interaction.guild, interaction.user, interaction.channel, false);
                }

                if (interaction.customId === "btn_canais") {
                    const m1 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("sel_logs").setPlaceholder("Canal de Logs Internos"));
                    const m2 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("sel_feed").setPlaceholder("Canal de Feedbacks Públicos"));
                    return interaction.reply({ content: "📢 **Canais:**", components: [m1, m2], ephemeral: true });
                }

                if (interaction.customId === "btn_staff") {
                    const r = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId("sel_role").setPlaceholder("Selecione o Cargo Staff"));
                    return interaction.reply({ content: "👥 **Staff:**", components: [r], ephemeral: true });
                }

                if (interaction.customId === "btn_aparencia") {
                    const modal = new ModalBuilder().setCustomId("mod_aparencia").setTitle("Configurar");
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_t").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_d").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_c").setLabel("Cor HEX").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_i").setLabel("URL do Banner").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_e").setLabel("Emoji").setStyle(TextInputStyle.Short).setRequired(false))
                    );
                    return interaction.showModal(modal);
                }

                if (interaction.customId === "btn_enviar") {
                    await interaction.deferReply({ ephemeral: true });
                    db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        const embed = new EmbedBuilder()
                            .setDescription(row?.embedDescription || TEXTO_FEEDBACK_PADRAO)
                            .setColor(row?.embedColor || "#FFFFFF")
                            .setImage(row?.embedImage || IMG_FEEDBACK_PADRAO);
                        if (row?.embedTitle) embed.setTitle(row.embedTitle);
                        const btn = new ButtonBuilder().setCustomId("start_feedback").setLabel(TEXTO_BTN_PADRAO).setStyle(ButtonStyle.Secondary);
                        try { btn.setEmoji(row?.buttonEmoji || EMOJI_BTN_PADRAO); } catch(e) { btn.setEmoji("⭐"); }
                        await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(btn)] });
                        return interaction.editReply("✅ Painel enviado!");
                    });
                }

                if (interaction.customId === "start_feedback") {
                    await interaction.deferReply({ ephemeral: true });
                    const tNome = `💚-feedback-${interaction.user.username}`;
                    if (interaction.channel.threads.cache.find(c => c.name === tNome)) return interaction.editReply("❌ Atendimento já aberto.");

                    const thread = await interaction.channel.threads.create({ name: tNome, autoArchiveDuration: 60, type: ChannelType.PrivateThread });
                    await thread.members.add(interaction.user.id);
                    client.feedbackStep[interaction.user.id] = "phone";

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        const av1 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<:emoji_67:1482232025363648652> Atenção! Vídeos apenas.");
                        const av2 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `informe seu celular`");
                        const mencao = `<@${interaction.user.id}>${row?.staffRole ? ` | <@&${row.staffRole}>` : ""}`;
                        await thread.send({ content: mencao, embeds: [av1, av2] });
                        return interaction.editReply(`✅ Tópico: <#${thread.id}>`);
                    });
                }
            }

            // Lógica de Menus e Modais mantida
            if (interaction.isModalSubmit() && interaction.customId === "mod_aparencia") {
                const [t, d, c, i, e] = ["f_t", "f_d", "f_c", "f_i", "f_e"].map(f => interaction.fields.getTextInputValue(f));
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel, row?.logChannel, row?.staffRole, t, d, c, i, e, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Salvo!", ephemeral: true });
            }

            if (interaction.isChannelSelectMenu()) {
                const cid = interaction.values[0];
                const isLog = interaction.customId === "sel_logs";
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, isLog ? row?.feedbackChannel : cid, isLog ? cid : row?.logChannel, row?.staffRole, row?.embedTitle, row?.embedDescription, row?.embedColor, row?.embedImage, row?.buttonEmoji, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Canal definido!", ephemeral: true });
            }

            if (interaction.isRoleSelectMenu()) {
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel, row?.logChannel, interaction.values[0], row?.embedTitle, row?.embedDescription, row?.embedColor, row?.embedImage, row?.buttonEmoji, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Staff definida!", ephemeral: true });
            }
        } catch (e) { console.error(e); }
    });

    client.on("messageCreate", async msg => {
        if (msg.author.bot || !msg.guild) return;
        const uid = msg.author.id;
        if (client.feedbackStep[uid] && msg.channel.isThread()) {
            const step = client.feedbackStep[uid];
            if (step === "phone") {
                client.feedbackPhone[uid] = msg.content; client.feedbackStep[uid] = "text";
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Envie o Feedback`")] });
            }
            if (step === "text") {
                client.feedbackText[uid] = msg.content; client.feedbackStep[uid] = "media";
                const r = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("skip_video").setLabel("Pular Vídeo").setStyle(ButtonStyle.Secondary));
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Envie o Vídeo`")], components: [r] });
            }
            if (step === "media") {
                const a = msg.attachments.first();
                if (!a?.contentType?.startsWith("video/")) return msg.channel.send("❌ Apenas vídeos!");
                client.feedbackMedia[uid] = a.url;
                await finalizarFeedback(msg.guild, msg.author, msg.channel, true);
            }
        }
    });
}
