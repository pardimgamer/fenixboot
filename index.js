const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// ================== MOTOR DO FIREBASE ==================
const admin = require('firebase-admin');
const serviceAccount = require("./firebase-key.json"); 

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

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

const CONFIG = {
    CANAL_APROVACAO: "1510465716065796196", 
    CANAL_LOGS_FINAL: "1510441424024506490",    
    LINK_LOGO: "https://i.imgur.com/7DmRBAv.png", 
    CARGO_VERIFICADO: "1510489553381884005", 
    CARGOS: {
        DiretorG: "1510477937311486283", DiretorEx: "1510478041896325180", CorregedorG: "1510478090399252520", Corregedor: "1510478160595255416", Delegado: "1510478399745818745", EscrivãoG: "1510483788755370164",Escrivão: "1510483790227574935", Perito: "1510483790856720434",
        ClasseEspecial: "1510483791590850571", Classe1: "1510484725125615616", Classe2: "1510484725720940687",
        Aluno: "1510484726534639616"
    },
    DIVISOES: {
        "DPF": "1510482823289503975", "COT": "1510481761040204007", "GPI": "1510481749577170964",
        "CAOP": "1510481986509340732", "NEPOM": "1510481761551912990"
    },
    UNIDADES: {
        "Polícia Federal": "1510492325925617725",
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
                .setDescription("Você foi exonerado da Policia Federal, agradecemos seu tempo de serviço.")
                .setColor(0xFF0000);
            
            await newMember.send({ embeds: [embedExpulso] }).catch(() => {});
            await newMember.kick('Cargo Verificado Removido (Exoneração/Desligamento)');

            const canalLog = newMember.guild.channels.cache.get(CONFIG.CANAL_LOGS_FINAL);
            if (canalLog) {
                const embedLogExp = new EmbedBuilder()
                    .setTitle("👢 MEMBRO EXPULSO")
                    .setColor(0xFF0000)
                    .setThumbnail(newMember.user.displayAvatarURL())
                    .setDescription(`O membro **${newMember.user.tag}** foi expulso automaticamente após a remoção do cargo <@&${CONFIG.CARGO_VERIFICADO}>.`)
                    .setTimestamp();
                await canalLog.send({ embeds: [embedLogExp] });
            }
        } catch (e) { console.error("Erro expulsão:", e.message); }
    }
});

// --- COMANDOS DE MENSAGEM ---
client.on('messageCreate', async (message) => {
    if (message.content === '!setup-painel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const embed = new EmbedBuilder().setTitle("PAINEL DE FUNCIONAL").setDescription("Solicite sua funcional através do painel. Clique no botão abaixo.").setColor(0x2F3136).setThumbnail(CONFIG.LINK_LOGO);
        const rowLinks = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Dúvidas').setStyle(ButtonStyle.Link).setURL('https://discord.com'), new ButtonBuilder().setLabel('Corregedoria').setStyle(ButtonStyle.Link).setURL('https://discord.com'), new ButtonBuilder().setLabel('Recursos Humanos').setStyle(ButtonStyle.Link).setURL('https://discord.com'));
        const rowAcao = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_modal').setLabel('Pedir funcional').setStyle(ButtonStyle.Success).setEmoji('📝'));
        await message.channel.send({ embeds: [embed], components: [rowLinks, rowAcao] });
        message.delete().catch(() => {});
    }

    if (message.content === '!setup-resultado') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const embedResult = new EmbedBuilder().setTitle("PAINEL DE RESULTADOS").setDescription("Clique abaixo para postar resultado.").setColor(0x00AAFF).setThumbnail(CONFIG.LINK_LOGO);
        const rowResult = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_modal_resultado').setLabel('Postar Resultado').setStyle(ButtonStyle.Primary).setEmoji('📊'));
        await message.channel.send({ embeds: [embedResult], components: [rowResult] });
        message.delete().catch(() => {});
    }

    if (message.content.startsWith('!publicar')) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const partes = message.content.split('|');
        if (partes.length < 3) return message.reply("⚠️ Use: !publicar Titulo | Resumo | Texto");
        try {
            await db.collection('diario').add({ titulo: partes[0].replace('!publicar', '').trim(), resumo: partes[1].trim(), texto: partes[2].trim(), data: new Date().toLocaleDateString('pt-BR'), secao: "1" });
            message.reply("✅ Publicado!");
        } catch (e) { message.reply("❌ Erro Firebase: " + e.message); }
    }
});

// --- INTERAÇÕES ---
client.on('interactionCreate', async (interaction) => {
    try {
        const isModalOpener = (interaction.isButton() && (interaction.customId === 'abrir_modal' || interaction.customId === 'abrir_modal_resultado'));
        
        if ((interaction.isButton() || interaction.isStringSelectMenu()) && !isModalOpener) {
            await interaction.deferUpdate().catch(() => {});
        }

        // --- LÓGICA DE MODAIS ---
        if (interaction.isButton() && interaction.customId === 'abrir_modal') {
             const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Registro de Funcional');
             modal.addComponents(
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('passaporte').setLabel("Passaporte (ID)").setStyle(TextInputStyle.Short).setRequired(true)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel("Nome e Sobrenome").setStyle(TextInputStyle.Short).setRequired(true)),
                 new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('idade').setLabel("Idade").setStyle(TextInputStyle.Short).setRequired(true))
             );
             return await interaction.showModal(modal);
        }

        if (interaction.isButton() && interaction.customId === 'abrir_modal_resultado') {
            const modalRes = new ModalBuilder().setCustomId('modal_resultado_edital').setTitle('Postar Resultado');
            modalRes.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('token_candidato').setLabel("Token").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nota_candidato').setLabel("Nota").setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('status_candidato').setLabel("Status").setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modalRes);
        }

        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
            const pass = interaction.fields.getTextInputValue('passaporte');
            const nome = interaction.fields.getTextInputValue('nome');
            const embed = new EmbedBuilder().setTitle("PF - Registro").setDescription(`👤 **Personagem:** ${nome}\n🆔 **Passaporte:** ${pass}\n\nSelecione a **Unidade**.`).setColor(0x2F3136);
            const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`unidade_${pass}_${nome.replace(/\s/g, '-')}`).setPlaceholder('Selecione...').addOptions(Object.keys(CONFIG.UNIDADES).map(k => ({ label: k, value: k }))));
            await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
        }

        // --- LÓGICA DE SELEÇÃO ---
        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('unidade_')) {
            const [, pass, nome] = interaction.customId.split('_');
            const unidade = interaction.values[0];
            const embed = new EmbedBuilder().setTitle("PF - Registro").setDescription(`**Unidade:** ${unidade}\n\nSelecione a **seção**.`).setColor(0x2F3136);
            const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`divisao_${pass}_${nome}_${unidade}`).setPlaceholder('Selecione...').addOptions([...Object.keys(CONFIG.DIVISOES).map(k => ({ label: k, value: k })), { label: 'Nenhum', value: 'Nenhum' }]));
            await interaction.editReply({ embeds: [embed], components: [menu] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('divisao_')) {
            const [, pass, nome, unidade] = interaction.customId.split('_');
            const divisao = interaction.values[0];
            const embed = new EmbedBuilder().setTitle("PF - Registro").setDescription(`**Unidade:** ${unidade}\n**Seção:** ${divisao}\n\nSelecione o **cargo**.`).setColor(0x2F3136);
            const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`cargo_${pass}_${nome}_${divisao}_${unidade}`).setPlaceholder('Selecione...').addOptions([...Object.keys(CONFIG.CARGOS).map(k => ({ label: k, value: k })), { label: 'Nenhum', value: 'Nenhum' }]));
            await interaction.editReply({ embeds: [embed], components: [menu] });
        }

        if (interaction.isStringSelectMenu() && interaction.customId.startsWith('cargo_')) {
            const [, pass, nome, divisao, unidade] = interaction.customId.split('_');
            const cargo = interaction.values[0];
            const canalAprov = interaction.guild.channels.cache.get(CONFIG.CANAL_APROVACAO);
            const embedStaff = new EmbedBuilder().setTitle("NOVA SOLICITAÇÃO").setColor(0xFFFF00).addFields({ name: "👤 Solicitante:", value: `${interaction.user}` }, { name: "📛 Nome:", value: nome.replace(/-/g, ' '), inline: true }, { name: "🆔 Passaporte:", value: pass, inline: true }, { name: "🏛️ Unidade:", value: unidade, inline: true }, { name: "🏢 Seção:", value: divisao, inline: true }, { name: "🎖️ Cargo:", value: cargo.toUpperCase(), inline: true });
            const botoes = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${cargo}_${divisao}_${pass}_${nome}_${unidade}`).setLabel('Aprovar').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`reprovar_${interaction.user.id}_${pass}_${nome}_${divisao}_${unidade}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger));
            if (canalAprov) { await canalAprov.send({ embeds: [embedStaff], components: [botoes] }); await interaction.editReply({ content: "✅ Enviado!", embeds: [], components: [] }); }
        }

        // --- APROVAÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
            const [, userId, cargoKey, divKey, pass, nomeFormatado, uniKey] = interaction.customId.split('_');
            const membro = await interaction.guild.members.fetch(userId).catch(() => null);
            if (membro) {
                if (CONFIG.CARGOS[cargoKey]) await membro.roles.add(CONFIG.CARGOS[cargoKey]).catch(() => {});
                if (CONFIG.DIVISOES[divKey]) await membro.roles.add(CONFIG.DIVISOES[divKey]).catch(() => {});
                if (CONFIG.UNIDADES[uniKey]) await membro.roles.add(CONFIG.UNIDADES[uniKey]).catch(() => {});
            }
            const logChannel = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_FINAL);
            if(logChannel) {
                const logEmbed = new EmbedBuilder().setTitle("✅ FUNCIONAL APROVADA").setColor(0x00FF00).setDescription(`**Membro:** <@${userId}>\n**Aprovador:** ${interaction.user}\n**Data:** ${new Date().toLocaleString()}`);
                await logChannel.send({embeds: [logEmbed]});
            }
            await interaction.update({ content: `✅ **APROVADO POR:** ${interaction.user}`, components: [] });
        }

        // --- REPROVAÇÃO ---
        if (interaction.isButton() && interaction.customId.startsWith('reprovar_')) {
            const modalRecusa = new ModalBuilder().setCustomId(`modal_recusa_${interaction.customId}`).setTitle('Motivo da Recusa');
            modalRecusa.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo da Recusa').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modalRecusa);
        }

        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_recusa_')) {
            const motivo = interaction.fields.getTextInputValue('motivo');
            const logChannel = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS_FINAL);
            if(logChannel) {
                const logEmbed = new EmbedBuilder().setTitle("❌ FUNCIONAL RECUSADA").setColor(0xFF0000).setDescription(`**Recusador:** ${interaction.user}\n**Motivo:** ${motivo}\n**Data:** ${new Date().toLocaleString()}`);
                await logChannel.send({embeds: [logEmbed]});
            }
            await interaction.update({ content: `❌ **RECUSADO POR:** ${interaction.user}\n**Motivo:** ${motivo}`, components: [] });
        }
    } catch (err) {
        console.error("ERRO CRÍTICO NA INTERAÇÃO:", err);
    }
});

client.login(process.env.TOKEN);