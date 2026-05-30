const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// ================== MOTOR DO FIREBASE ==================
const admin = require('firebase-admin');

// Lê a chave diretamente da variável de ambiente do Railway
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// ================== CONFIGURAÇÃO DO CLIENT ==================
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildModeration
    ] 
});

// ================== CONFIGURAÇÃO DE IDS ==================
const CONFIG = {
    CANAL_APROVACAO: "1472328584411480185", 
    CANAL_LOGS_FINAL: "1472367324228096192",    
    LINK_LOGO: "https://i.imgur.com/7DmRBAv.png", 
    
    CARGO_VERIFICADO: "1471978377295433739", 

    CARGOS: {
        Delegado: "1471978828543824044",
        Escrivão: "1471991396251734209",
        Perito: "1471979171466186835",
        ClasseEspecial: "1471991328874434691",
        Classe1: "1471991453210382511",
        Classe2: "1471991487905403001",
        Classe3: "1471991525675372586",
        Administrativo: "1471991585712640236",
        Aluno: "1471991623419166750"
    },
    DIVISOES: {
        "DPF": "1471998548563464233",
        "COT-A": "1471991722006286366",
        "GPI": "1471991858103320656",
        "CAOP": "1471991790289813638",
        "NEPOM": "1471991977565487270"
    },
    UNIDADES: {
        "PF": "1471978146742927673",
        "PM": "1471995584247496714",
        "PC": "1471995583223959634",
        "PRF": "1471995581894230119",
        "EB": "1471995582389424311",
        "GCM": "1471995584826052750",
        "RF": "1471995586302705726",
        "PREF": "1471983935750799421"
    }
};

client.once('ready', () => {
    console.log(`✅ Agente Federal: Sistema Online | Direção Geral: Miguel Fernandes`);
});

// --- MONITORAMENTO DE EXPULSÃO ---
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const tinhaCargo = oldMember.roles.cache.has(CONFIG.CARGO_VERIFICADO);
    const temCargoAgora = newMember.roles.cache.has(CONFIG.CARGO_VERIFICADO);

    if (tinhaCargo && !temCargoAgora) {
        try {
            const embedExpulso = new EmbedBuilder()
                .setTitle("⚠️ EXONERADO")
                .setDescription("Você foi exonerado da Polícia Federal. Agradecemos seu tempo de serviço.")
                .setColor(0xFF0000);
            
            await newMember.send({ embeds: [embedExpulso] }).catch(() => {});
            await newMember.kick('Cargo Verificado Removido (Exoneração/Desligamento)');

            const canalLog = newMember.guild.channels.cache.get(CONFIG.CANAL_LOGS_FINAL);
            if (canalLog) {
                const embedLogExp = new EmbedBuilder()
                    .setTitle("🔬 EXONERAÇÃO EFETUADA")
                    .setColor(0xFF0000)
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .setDescription(`O membro **${newMember.user.tag}** foi desvinculado do servidor automaticamente após a remoção do cargo <@&${CONFIG.CARGO_VERIFICADO}>.`)
                    .setFooter({ text: "Superintendência da Polícia Federal" })
                    .setTimestamp();
                await canalLog.send({ embeds: [embedLogExp] });
            }
        } catch (e) { 
            console.error("Erro ao processar expulsão:", e.message); 
        }
    }
});

// --- SETUP DO PAINEL E COMANDOS ---
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-painel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle("PAINEL DE FUNCIONAL")
            .setDescription("Solicite sua funcional através do painel. Clique no botão abaixo e comece sua jornada dentro da corporação.")
            .setColor(0x2F3136)
            .setThumbnail(CONFIG.LINK_LOGO);

        const rowLinks = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Dúvidas').setStyle(ButtonStyle.Link).setURL('https://discord.com'),
            new ButtonBuilder().setLabel('Corregedoria').setStyle(ButtonStyle.Link).setURL('https://discord.com'),
            new ButtonBuilder().setLabel('Recursos Humanos').setStyle(ButtonStyle.Link).setURL('https://discord.com')
        );

        const rowAcao = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_modal').setLabel('Pedir funcional').setStyle(ButtonStyle.Success).setEmoji('📝')
        );

        await message.channel.send({ embeds: [embed], components: [rowLinks, rowAcao] });
        message.delete().catch(() => {});
    }

    if (message.content === '!setup-resultado') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embedResult = new EmbedBuilder()
            .setTitle("PAINEL DE RESULTADOS")
            .setDescription("Clique no botão abaixo para preencher o formulário de resultado de edital.")
            .setColor(0x00AAFF)
            .setThumbnail(CONFIG.LINK_LOGO);

        const rowResult = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_modal_resultado')
                .setLabel('Postar Resultado')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📊')
        );

        await message.channel.send({ embeds: [embedResult], components: [rowResult] });
        message.delete().catch(() => {});
    }

    if (message.content.startsWith('!publicar')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const partes = message.content.split('|');
        if (partes.length < 3) return message.reply("⚠️ Use: !publicar Titulo | Resumo | Texto");

        try {
            await db.collection('diario').add({
                titulo: partes[0].replace('!publicar', '').trim(),
                resumo: partes[1].trim(),
                texto: partes[2].trim(),
                data: new Date().toLocaleDateString('pt-BR'),
                secao: "1"
            });
            message.reply("✅ Documento publicado com sucesso no Diário Oficial!");
        } catch (e) {
            message.reply("❌ Erro ao conectar ao Firebase: " + e.message);
        }
    }
});

// --- INTERAÇÕES (MODAL E MENUS) ---
client.on('interactionCreate', async (interaction) => {
    
    if (interaction.isButton() && interaction.customId === 'abrir_modal') {
        const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Registro de Funcional');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('passaporte').setLabel("Passaporte (ID)").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel("Nome e Sobrenome").setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel("Idade").setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.isButton() && interaction.customId === 'abrir_modal_resultado') {
        const modalRes = new ModalBuilder().setCustomId('modal_resultado_edital').setTitle('Postar Resultado no Site');
        
        modalRes.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('token_candidato').setLabel("Token do Candidato").setStyle(TextInputStyle.Short).setPlaceholder("Ex: PF-2026-001").setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota_candidato').setLabel("Nota").setStyle(TextInputStyle.Short).setPlaceholder("Ex: 9.50").setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('status_candidato').setLabel("Status").setStyle(TextInputStyle.Short).setPlaceholder("APROVADO ou REPROVADO").setRequired(true))
        );
        await interaction.showModal(modalRes);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
        const pass = interaction.fields.getTextInputValue('passaporte');
        const nome = interaction.fields.getTextInputValue('nome');
        const embed = new EmbedBuilder()
            .setTitle("PF - Registro")
            .setDescription(`👤 **Personagem:** ${nome}\n🆔 **Passaporte:** ${pass}\n\nSelecione a **Unidade Policial**.`)
            .setColor(0x2F3136);
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`unidade_${pass}_${nome.replace(/\s/g, '-')}`).setPlaceholder('Selecione a Unidade...').addOptions(Object.keys(CONFIG.UNIDADES).map(k => ({ label: k, value: k }))));
        await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_resultado_edital') {
        const resToken = interaction.fields.getTextInputValue('token_candidato').toUpperCase();
        const resNota = interaction.fields.getTextInputValue('nota_candidato');
        const resStatus = interaction.fields.getTextInputValue('status_candidato').toUpperCase();

        try {
            await db.collection('resultados').add({
                token: resToken,
                nota: resNota,
                status: resStatus
            });
            await interaction.reply({ content: `✅ **Sucesso!** O resultado do token **${resToken}** foi publicado no site oficial.`, ephemeral: true });
        } catch (e) {
            console.error(e);
            await interaction.reply({ content: "❌ Erro ao salvar o resultado no banco de dados.", ephemeral: true });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('unidade_')) {
        const [, pass, nome] = interaction.customId.split('_');
        const unity = interaction.values[0];
        const embed = new EmbedBuilder().setTitle("PF - Registro").setDescription(`**Unidade:** ${unity}\n\nSelecione sua **seção/divisão**.`).setColor(0x2F3136);
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`divisao_${pass}_${nome}_${unity}`).setPlaceholder('Selecione a seção...').addOptions([...Object.keys(CONFIG.DIVISOES).map(k => ({ label: k, value: k })), { label: 'Nenhum', value: 'Nenhum' }]));
        await interaction.update({ embeds: [embed], components: [menu] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('divisao_')) {
        const [, pass, nome, unity] = interaction.customId.split('_');
        const division = interaction.values[0];
        const embed = new EmbedBuilder().setTitle("PF - Registro").setDescription(`**Unidade:** ${unity}\n**Seção:** ${division}\n\nSelecione o **cargo**.`).setColor(0x2F3136);
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`cargo_${pass}_${nome}_${division}_${unity}`).setPlaceholder('Selecione o cargo...').addOptions([...Object.keys(CONFIG.CARGOS).map(k => ({ label: k, value: k })), { label: 'Nenhum', value: 'Nenhum' }]));
        await interaction.update({ embeds: [embed], components: [menu] });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('cargo_')) {
        const [, pass, nome, division, unity] = interaction.customId.split('_');
        const cargo = interaction.values[0];
        const canalAprov = interaction.guild.channels.cache.get(CONFIG.CANAL_APROVACAO);

        // SALVA PROTOCOLO CURTO NO FIREBASE PARA NÃO ESTOURAR O LIMITE DE CARACTERES DO BOTÃO
        try {
            const docRef = await db.collection('solicitacoes_pendentes').add({
                userId: interaction.user.id,
                passaporte: pass,
                nomeReal: nome.replace(/-/g, ' '),
                unidade: unity,
                divisao: division,
                cargo: cargo,
                data: new Date()
            });

            const embedStaff = new EmbedBuilder()
                .setTitle("NOVA SOLICITAÇÃO DE FUNCIONAL")
                .setColor(0xFFFF00)
                .addFields(
                    { name: "👤 Solicitante:", value: `${interaction.user}` }, 
                    { name: "📛 Nome RP:", value: nome.replace(/-/g, ' '), inline: true }, 
                    { name: "🆔 Passaporte:", value: pass, inline: true }, 
                    { name: "🏛️ Unidade:", value: unity, inline: true }, 
                    { name: "🏢 Seção:", value: division, inline: true }, 
                    { name: "🎖️ Cargo:", value: cargo.toUpperCase(), inline: true }
                );

            // Passa apenas o ID curto do Firebase no botão (Evita 100% o erro de interação!)
            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`ap_rec_${docRef.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success), 
                new ButtonBuilder().setCustomId(`rj_rec_${docRef.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
            );

            if (canalAprov) { 
                await canalAprov.send({ embeds: [embedStaff], components: [botoes] }); 
                await interaction.update({ content: "✅ Seus dados foram compilados e enviados para a aprovação da Superintendência!", embeds: [], components: [] }); 
            }
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "❌ Erro interno ao processar formulário.", ephemeral: true });
        }
    }

    // INTERAÇÃO DO BOTÃO DE APROVAR
    if (interaction.isButton() && interaction.customId.startsWith('ap_rec_')) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        await interaction.deferUpdate();

        const docId = interaction.customId.replace('ap_rec_', '');
        const snapshot = await db.collection('solicitacoes_pendentes').doc(docId).get();

        if (!snapshot.exists) {
            return await interaction.followup.send({ content: "❌ Dados da solicitação não encontrados ou já processados.", ephemeral: true });
        }

        const dados = snapshot.data();
        const membro = await interaction.guild.members.fetch(dados.userId).catch(() => null);

        if (membro) {
            try {
                if (CONFIG.CARGOS[dados.cargo]) await membro.roles.add(CONFIG.CARGOS[dados.cargo]).catch(() => {});
                if (CONFIG.DIVISOES[dados.divisao]) await membro.roles.add(CONFIG.DIVISOES[dados.divisao]).catch(() => {});
                if (CONFIG.UNIDADES[dados.unidade]) await membro.roles.add(CONFIG.UNIDADES[dados.unidade]).catch(() => {});
                if (CONFIG.CARGO_VERIFICADO) await membro.roles.add(CONFIG.CARGO_VERIFICADO).catch(() => {});
                if (membro.manageable) await membro.setNickname(`[${dados.passaporte}] ${dados.nomeReal}`).catch(() => {});

                const embedDM = new EmbedBuilder()
                    .setTitle("✅ SUA FUNCIONAL FOI APROVADA!")
                    .setColor(0x00FF00)
                    .setDescription(`Olá **${dados.nomeReal}**, sua solicitação de credenciais foi aceita!`)
                    .addFields(
                        { name: "🏛️ Unidade:", value: `${dados.unidade}`, inline: true }, 
                        { name: "🎖️ Cargo:", value: `${dados.cargo.toUpperCase()}`, inline: true }
                    )
                    .setThumbnail(CONFIG.LINK_LOGO).setTimestamp();
                
                await membro.send({ embeds: [embedDM] }).catch(() => {});
                await interaction.editReply({ content: `✅ **APROVADO POR:** ${interaction.user}`, components: [] });

                const canalLog = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_FINAL);
                if (canalLog) {
                    const agora = Math.floor(Date.now() / 1000);
                    const embedLog = new EmbedBuilder()
                        .setTitle("📋 LOG DE CREDENCIAIS EMITIDAS")
                        .setColor(0x2F3136)
                        .setThumbnail(membro.user.displayAvatarURL({ dynamic: true }))
                        .addFields(
                            { name: "👤 Membro:", value: `${membro} (${membro.id})`, inline: false },
                            { name: "👮 Autorizado por:", value: `${interaction.user}`, inline: false },
                            { name: "🆔 Passaporte:", value: `${dados.passaporte}`, inline: true },
                            { name: "🏛️ Unidade:", value: `${dados.unidade}`, inline: true },
                            { name: "🏢 Seção:", value: `${dados.divisao}`, inline: true },
                            { name: "🎖️ Cargo:", value: `${dados.cargo.toUpperCase()}`, inline: false },
                            { name: "📅 Data de Emissão:", value: `<t:${agora}:F>`, inline: false },
                            { name: "🛡️ Direção Geral:", value: "Miguel Fernandes", inline: false }
                        )
                        .setFooter({ text: `Sistema de Credenciais da Superintendência` });
                    await canalLog.send({ embeds: [embedLog] });
                }

                // Deleta do banco temporário após aprovar
                await db.collection('solicitacoes_pendentes').doc(docId).delete();

            } catch (e) { console.error(e); }
        }
    }

    // INTERAÇÃO DO BOTÃO DE REPROVAR
    if (interaction.isButton() && interaction.customId.startsWith('rj_rec_')) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        await interaction.deferUpdate();

        const docId = interaction.customId.replace('rj_rec_', '');
        const snapshot = await db.collection('solicitacoes_pendentes').doc(docId).get();

        if (snapshot.exists) {
            const dados = snapshot.data();
            const membro = await interaction.guild.members.fetch(dados.userId).catch(() => null);

            if (membro) {
                const embedDMReprov = new EmbedBuilder()
                    .setTitle("❌ SUA FUNCIONAL FOI REPROVADA!")
                    .setColor(0xFF0000)
                    .setDescription(`Sua solicitação de credenciais foi recusada pela administração da Superintendência.`)
                    .setTimestamp();
                await membro.send({ embeds: [embedDMReprov] }).catch(() => {});
            }
            await db.collection('solicitacoes_pendentes').doc(docId).delete();
        }
        await interaction.editReply({ content: `❌ **REPROVADO POR:** ${interaction.user}`, components: [] });
    }
});

client.login(process.env.TOKEN);