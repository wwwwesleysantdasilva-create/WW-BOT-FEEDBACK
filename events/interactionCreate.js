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

    // Inicialização do banco com colunas extras
    db.serialize(() => {
        db.run(`ALTER TABLE config ADD COLUMN staffRole TEXT`, (err) => {});
        db.run(`ALTER TABLE config ADD COLUMN logChannel TEXT`, (err) => {});
    });

    client.feedbackStep ??= {}
    client.feedbackMedia ??= {}
    client.feedbackPhone ??= {}
    client.feedbackText ??= {} 

    // === LINKS E TEXTOS PADRÃO ===
    const IMG_PAINEL_CONTROL = "https://cdn.discordapp.com/attachments/1457915880481624094/1482260307454726164/IMG_2287.jpg?ex=69b64dfc&is=69b4fc7c&hm=284817a4ecd31c1bd5e0bea4f62ec7a9ca28a5baf61d8c97ca1318bd9d4d499a&";
    const IMG_FEEDBACK_PADRAO = "https://cdn.discordapp.com/attachments/1457915880481624094/1482256686008766495/IMG_2285.png";
    
    const TEXTO_FEEDBACK_PADRAO = "** Bem Vindo ao painel De feedbacks **\n\n<:emoji_40:1478558562010534088> Caso queira deixar um **Feedback** Clique no botão abaixo !";
    const EMOJI_BTN_PADRAO = "<:emoji_65:1482230136538529942>";
    const TEXTO_BTN_PADRAO = "Enviar Feedback";

    const finalizarFeedback = async (guild, author, thread, temVideo) => {
        const userId = author.id;
        db.get(`SELECT feedbackChannel FROM config WHERE guild=?`, [guild.id], async (err, row) => {
            if (!row?.feedbackChannel) return thread.send("❌ Erro: Canal de feedbacks não configurado.");
            const canalAlvo = guild.channels.cache.get(row.feedbackChannel);
            if (!canalAlvo) return thread.send("❌ Erro: Canal não encontrado.");

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
            /* ================= SLASH COMMANDS ================= */
            if (interaction.isChatInputCommand()) {
                if (interaction.commandName === "painel") {
                    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });

                    const r1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("btn_canais").setLabel("Canais").setEmoji("<:emoji_63:1482158321120051290>").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("btn_staff").setLabel("Cargo staff").setEmoji("<:emoji_3:1465361454269075720>").setStyle(ButtonStyle.Primary)
                    );
                    const r2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("btn_aparencia").setLabel("Configurar Aparência").setEmoji("<:emoji_62:1482158294649934017>").setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId("btn_enviar").setLabel("Enviar Embed").setEmoji("<a:emoji_60:1482141690721734776>").setStyle(ButtonStyle.Success)
                    );

                    return interaction.reply({ content: IMG_PAINEL_CONTROL, components: [r1, r2], ephemeral: true });
                }

                if (interaction.commandName === "fechar") {
                    if (!interaction.channel.isThread()) return interaction.reply({ content: "❌ Use em tópicos.", ephemeral: true });
                    await interaction.reply("🔒 Fechando tópico...");
                    setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
                }
            }

            /* ================= BOTÕES ================= */
            if (interaction.isButton()) {
                const uid = interaction.user.id;

                if (interaction.customId === "skip_video") {
                    await interaction.deferUpdate();
                    await finalizarFeedback(interaction.guild, interaction.user, interaction.channel, false);
                }

                if (interaction.customId === "btn_canais") {
                    const m1 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("sel_logs").setPlaceholder("Selecionar Canal de Logs"));
                    const m2 = new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId("sel_feed").setPlaceholder("Selecionar Canal de Feedbacks"));
                    return interaction.reply({ content: "📢 **Configuração de Canais:**", components: [m1, m2], ephemeral: true });
                }

                if (interaction.customId === "btn_staff") {
                    const r = new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId("sel_role").setPlaceholder("Selecionar Cargo Staff"));
                    return interaction.reply({ content: "👥 **Configuração de Staff:**", components: [r], ephemeral: true });
                }

                if (interaction.customId === "btn_aparencia") {
                    const modal = new ModalBuilder().setCustomId("mod_aparencia").setTitle("Customizar Painel");
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_t").setLabel("Título").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_d").setLabel("Descrição").setStyle(TextInputStyle.Paragraph).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_c").setLabel("Cor HEX").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_i").setLabel("Banner").setStyle(TextInputStyle.Short).setRequired(false)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("f_e").setLabel("Emoji Botão").setStyle(TextInputStyle.Short).setRequired(false))
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
                        return interaction.editReply("✅ Painel de feedback enviado!");
                    });
                }

                if (interaction.customId === "start_feedback") {
                    await interaction.deferReply({ ephemeral: true });
                    const tNome = `💚-feedback-${interaction.user.username}`;
                    if (interaction.channel.threads.cache.find(c => c.name === tNome)) return interaction.editReply("❌ Você já tem um atendimento aberto.");

                    const thread = await interaction.channel.threads.create({ name: tNome, autoArchiveDuration: 60, type: ChannelType.PrivateThread });
                    await thread.members.add(interaction.user.id);
                    client.feedbackStep[interaction.user.id] = "phone";

                    db.get(`SELECT staffRole FROM config WHERE guild=?`, [interaction.guild.id], async (err, row) => {
                        const e1 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<:emoji_67:1482232025363648652> Atenção ao enviar Seu feedback , Nao aceitamos foto como feedbacks!!");
                        const e2 = new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `informe seu celular`");
                        const mencao = `<@${interaction.user.id}>${row?.staffRole ? ` | <@&${row.staffRole}>` : ""}`;
                        await thread.send({ content: mencao, embeds: [e1, e2] });
                        return interaction.editReply(`✅ Tópico aberto: <#${thread.id}>`);
                    });
                }
            }

            /* ================= SALVAMENTO (MODAL E MENUS) ================= */
            if (interaction.isModalSubmit() && interaction.customId === "mod_aparencia") {
                const [t, d, c, i, e] = ["f_t", "f_d", "f_c", "f_i", "f_e"].map(id => interaction.fields.getTextInputValue(id));
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel, row?.logChannel, row?.staffRole, t, d, c, i, e, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Aparência salva!", ephemeral: true });
            }

            if (interaction.isChannelSelectMenu()) {
                const cid = interaction.values[0];
                const isLog = interaction.customId === "sel_logs";
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, isLog ? row?.feedbackChannel : cid, isLog ? cid : row?.logChannel, row?.staffRole, row?.embedTitle, row?.embedDescription, row?.embedColor, row?.embedImage, row?.buttonEmoji, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Canal atualizado!", ephemeral: true });
            }

            if (interaction.isRoleSelectMenu()) {
                db.get(`SELECT * FROM config WHERE guild=?`, [interaction.guild.id], (err, row) => {
                    db.run(`INSERT OR REPLACE INTO config (guild, feedbackChannel, logChannel, staffRole, embedTitle, embedDescription, embedColor, embedImage, buttonEmoji, buttonLabel) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [interaction.guild.id, row?.feedbackChannel, row?.logChannel, interaction.values[0], row?.embedTitle, row?.embedDescription, row?.embedColor, row?.embedImage, row?.buttonEmoji, TEXTO_BTN_PADRAO]);
                });
                return interaction.reply({ content: "✅ Staff atualizada!", ephemeral: true });
            }
        } catch (e) { console.error(e); }
    });

    /* ================= TICKET FLOW ================= */
    client.on("messageCreate", async msg => {
        if (msg.author.bot || !msg.guild) return;
        const uid = msg.author.id;
        if (client.feedbackStep[uid] && msg.channel.isThread()) {
            const step = client.feedbackStep[uid];
            if (step === "phone") {
                client.feedbackPhone[uid] = msg.content; client.feedbackStep[uid] = "text";
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Agora Envie Seu Feedback`")] });
            }
            if (step === "text") {
                client.feedbackText[uid] = msg.content; client.feedbackStep[uid] = "media";
                const r = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("skip_video").setLabel("Pular Vídeo").setStyle(ButtonStyle.Secondary).setEmoji("⏭️"));
                return msg.channel.send({ content: `<@${uid}>`, embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription("<a:emoji_60:1482141690721734776> `Agora envie Seu Video`")], components: [r] });
            }
            if (step === "media") {
                const a = msg.attachments.first();
                if (!a?.contentType?.startsWith("video/")) return msg.channel.send("❌ Apenas arquivos de vídeo são aceitos!");
                client.feedbackMedia[uid] = a.url;
                await finalizarFeedback(msg.guild, msg.author, msg.channel, true);
            }
        }
    });
}
