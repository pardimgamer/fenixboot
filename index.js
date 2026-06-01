const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    StringSelectMenuBuilder, 
    UserSelectMenuBuilder,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ==================== CONFIGURAÇÕES DO SERVIDOR ====================
const CONFIG = {
    CANAL_PAINEL: "1509355419066306602",
    CANAL_APROVACAO: "1510465716065796196",
    CANAL_LOGS: "1510441424024506490",

    // 🔴 INSIRA OS IDS DOS SEUS CANAIS AQUI:
    CANAL_SOBRE_NOS: "1509350392377507870",  
    CANAL_FALE_CONOSCO: "1509348730959167609",
    CANAL_ASCOM: "1509353458845614100",

    // URL Direta Corrigida da Logo da Polícia Federal (Sem quebras)
    LOGO_URL: "https://i.imgur.com/wUKG9e9.png", 

    // CARGO GERAL DA POLÍCIA FEDERAL (Entregue a todos os aprovados)
    CARGO_POLICIA_FEDERAL: "1510482823289503975", 

    // Mapeamento de IDs de Cargos para atribuição automática
    CARGOS: {
        "diretor_geral": "1510477937311486283",
        "diretor_executivo": "1510478041896325180",
        "corregedor_geral": "1510478160595255416",
        "delegado_geral": "1510478337925972018",
        "delegado": "1510478399745818745",
        "coordenador_operacional": "1510478472466927686",
        "escrivao_geral": "1510483788755370164",
        "escrivao": "1510483790227574935",
        "investigador": "1510806328753393745",
        "chefe_divisao": "1510483787946135703",
        "chefe_nucleo": "1510483788260704286",
        "agente_1": "1510484725125615616",
        "agente_2": "1510484725720940687",
        "classe_especial": "1510483791590850571",        
        "aluno": "1510484726534639616"
    },

    // Mapeamento de IDs das Unidades
    UNIDADES: {
        "gpi": "1510481749577170964",
        "cot": "1510481761040204007",
        "caop": "1510481986509340732",
        "nepom": "1510481761551912990",
        "dpf": "1510482823289503975"
    }
};

const cacheFormulario = new Map();

function getSPTimestamp() {
    return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

client.once('ready', async () => {
    console.log(`🚀 Bot Fenix online como: ${client.user.tag}`);
    try {
        const canal = await client.channels.fetch(CONFIG.CANAL_PAINEL);
        if (canal) {
            const mensagens = await canal.messages.fetch({ limit: 10 });
            const botEncontrouPainel = mensagens.some(msg => msg.author.id === client.user.id && msg.embeds.length > 0);
            if (!botEncontrouPainel) {
                console.log("📺 Painel não encontrado no canal. Gerando um novo automaticamente...");
                await enviarPainel(canal);
            }
        }
    } catch (error) {
        console.error("❌ Erro ao tentar enviar o painel automaticamente:", error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === '!painel' && message.channel.id === CONFIG.CANAL_PAINEL) {
        await message.delete().catch(() => null);
        await enviarPainel(message.channel);
    }
});

// Envia o Painel exatamente com o mesmo layout estético de botões abaixo do Embed
async function enviarPainel(canal) {
    const embed = new EmbedBuilder()
        .setTitle("PAINEL DE FUNCIONAL")
        .setDescription("Solicite sua funcional através do painel. Clique no botão abaixo.")
        .setColor("#101114")
        .setThumbnail(CONFIG.LOGO_URL);

    // Linha com os 3 botões estilizados secundários (Cinzas) apontando para os canais internos
    const rowCanaisInternos = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_sobre_nos').setLabel('Sobre nós').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_fale_conosco').setLabel('Fale conosco').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('btn_ascom').setLabel('ASCOM').setStyle(ButtonStyle.Secondary)
    );

    const rowBotaoPrincipal = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pedir_funcional').setLabel('📝 Pedir funcional').setStyle(ButtonStyle.Success)
    );

    await canal.send({ embeds: [embed], components: [rowCanaisInternos, rowBotaoPrincipal] });
}

// ==================== INTERAÇÕES DO FORMULÁRIO E BOTÕES ====================
client.on('interactionCreate', async (interaction) => {
    const userId = interaction.user.id;

    // Redirecionamentos dos botões internos por ID de Canal
    if (interaction.isButton()) {
        if (interaction.customId === 'btn_sobre_nos') {
            return await interaction.reply({ content: `➡️ Acesse o canal clicando aqui: <#${CONFIG.CANAL_SOBRE_NOS}>`, ephemeral: true }).catch(() => null);
        }
        if (interaction.customId === 'btn_fale_conosco') {
            return await interaction.reply({ content: `➡️ Acesse o canal clicando aqui: <#${CONFIG.CANAL_FALE_CONOSCO}>`, ephemeral: true }).catch(() => null);
        }
        if (interaction.customId === 'btn_ascom') {
            return await interaction.reply({ content: `➡️ Acesse o canal clicando aqui: <#${CONFIG.CANAL_ASCOM}>`, ephemeral: true }).catch(() => null);
        }
    }

    // Etapa 1: Abrir o Modal Limpo sem ID duplicado
    if (interaction.isButton() && interaction.customId === 'pedir_funcional') {
        if (interaction.replied || interaction.deferred) return;
        try {
            const modal = new ModalBuilder()
                .setCustomId('modal_dados_funcional')
                .setTitle('Registro de Funcional');

            const inputNome = new TextInputBuilder()
                .setCustomId('txt_nome')
                .setLabel('Nome e Sobrenome *')
                .setPlaceholder('Exemplo: Miguel Fernandes')
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const inputPassaporte = new TextInputBuilder()
                .setCustomId('txt_passaporte')
                .setLabel('Passaporte (Apenas Números) *')
                .setPlaceholder('Exemplo: 710')
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            const inputIdade = new TextInputBuilder()
                .setCustomId('txt_idade')
                .setLabel('Idade *')
                .setRequired(true)
                .setStyle(TextInputStyle.Short);

            modal.addComponents(
                new ActionRowBuilder().addComponents(inputNome),
                new ActionRowBuilder().addComponents(inputPassaporte),
                new ActionRowBuilder().addComponents(inputIdade)
            );

            await interaction.showModal(modal);
            return;
        } catch (err) {
            console.error("⚠️ Erro controlado ao tentar exibir o modal:", err.message);
            return;
        }
    }

    // Etapa 2: Receber o Modal -> Mostrar Select de Cargos
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_dados_funcional') {
        const nome = interaction.fields.getTextInputValue('txt_nome');
        const passaporte = interaction.fields.getTextInputValue('txt_passaporte');
        const idade = interaction.fields.getTextInputValue('txt_idade');

        cacheFormulario.set(userId, { passaporte, nome, idade });

        const menuCargos = new StringSelectMenuBuilder()
            .setCustomId('select_cargo')
            .setPlaceholder('Selecione o cargo requisitado')
            .addOptions([
                { label: 'Diretor Geral', value: 'diretor_geral' },
                { label: 'Diretor Executivo', value: 'diretor_executivo' },
                { label: 'Delegado Geral', value: 'delegado_geral' },
                { label: 'Delegado', value: 'delegado' },
                { label: 'Coordenador Operacional', value: 'coordenador_operacional' },
                { label: 'Escrivão Geral', value: 'escrivao_geral' },
                { label: 'Escrivão', value: 'escrivao' },
                { label: 'Investigador', value: 'investigador' },
                { label: 'Chefe de Divisão', value: 'chefe_divisao' },
                { label: 'Chefe de Núcleo', value: 'chefe_nucleo' },
                { label: 'Agente de 1º Classe', value: 'agente_1' },
                { label: 'Agente de 2º Classe', value: 'agente_2' },
                { label: 'Agente Classe Especial', value: 'classe_especial' },
                { label: 'Aluno ANP', value: 'aluno' }
            ]);

        const row = new ActionRowBuilder().addComponents(menuCargos);
        return await interaction.reply({ content: '➡️ Selecione o seu cargo abaixo:', components: [row], ephemeral: true }).catch(() => null);
    }

    // Etapa 3: Receber Cargo -> Mostrar Select de Guarnições/Unidades
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_cargo') {
        const dados = cacheFormulario.get(userId);
        if (!dados) return interaction.reply({ content: "Sessão expirada. Comece novamente.", ephemeral: true }).catch(() => null);

        dados.cargoKey = interaction.values[0];
        cacheFormulario.set(userId, dados);

        const menuUnidades = new StringSelectMenuBuilder()
            .setCustomId('select_unidade')
            .setPlaceholder('Selecione a guarnição solicitada')
            .addOptions([
                { label: 'Grupo de Pronta Intervenção (GPI)', value: 'gpi' },
                { label: 'Equipe Alpha (COT-A)', value: 'cot' },
                { label: 'CAOP', value: 'caop' },
                { label: 'NEPOM', value: 'nepom' },
                { label: 'Unidade Operacional Regional - DPF', value: 'dpf' }
            ]);

        const row = new ActionRowBuilder().addComponents(menuUnidades);
        return await interaction.update({ content: '➡️ Selecione a sua Guarnição/Unidade:', components: [row], ephemeral: true }).catch(() => null);
    }

    // Etapa 4: Receber Unidade -> Mostrar UserSelectMenu
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_unidade') {
        const dados = cacheFormulario.get(userId);
        if (!dados) return interaction.reply({ content: "Sessão expirada.", ephemeral: true }).catch(() => null);

        dados.unidadeKey = interaction.values[0];
        cacheFormulario.set(userId, dados);

        const menuMembros = new UserSelectMenuBuilder()
            .setCustomId('select_convidado')
            .setPlaceholder('Selecione quem te convidou');

        const row = new ActionRowBuilder().addComponents(menuMembros);
        return await interaction.update({ content: '➡️ Selecione o membro que convidou você:', components: [row], ephemeral: true }).catch(() => null);
    }

    // Finalização do Envio: Monta o Embed no Canal de Aprovação
    if (interaction.isUserSelectMenu() && interaction.customId === 'select_convidado') {
        const dados = cacheFormulario.get(userId);
        if (!dados) return interaction.reply({ content: "Sessão expirada.", ephemeral: true }).catch(() => null);

        dados.convidadoId = interaction.values[0];

        const labelCargo = interaction.guild.roles.cache.get(CONFIG.CARGOS[dados.cargoKey])?.name || dados.cargoKey.toUpperCase();
        const labelUnidade = interaction.guild.roles.cache.get(CONFIG.UNIDADES[dados.unidadeKey])?.name || dados.unidadeKey.toUpperCase();

        const canalAprovacao = interaction.guild.channels.cache.get(CONFIG.CANAL_APROVACAO);
        if (canalAprovacao) {
            const embedStaff = new EmbedBuilder()
                .setTitle(`Funcional solicitada - ${interaction.user.username}`)
                .setThumbnail(CONFIG.LOGO_URL)
                .setColor("#2b2d31")
                .addFields(
                    { name: 'Personagem:', value: `\`\`\`${dados.nome}\`\`\``, inline: true },
                    { name: 'Idade:', value: `\`\`\`${dados.idade} anos\`\`\``, inline: true },
                    { name: 'Passaporte:', value: `\`\`\`${dados.passaporte}\`\`\``, inline: true },
                    { name: 'Onde será direcionado:', value: `\`\`\`Polícia Federal\`\`\`` },
                    { name: 'Guarnição solicitada:', value: `\`\`\`${labelUnidade}\`\`\`` },
                    { name: 'Cargo requisitado:', value: `\`\`\`${labelCargo}\`\`\`` },
                    { name: 'Convidado por:', value: `<@${dados.convidadoId}>`, inline: true },
                    { name: 'Adaptação:', value: `\`\`\` 📋 Aguardando Análise \`\`\``, inline: true }
                );

            const botoesStaff = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_${userId}`).setLabel('Aceitar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reprovar_${userId}`).setLabel('Recusar').setStyle(ButtonStyle.Danger)
            );

            await canalAprovacao.send({ embeds: [embedStaff], components: [botoesStaff] }).catch(() => null);
        }

        cacheFormulario.delete(userId);
        return await interaction.update({ content: '✅ Sua funcional foi enviada com sucesso para avaliação dos diretores!', components: [], ephemeral: true }).catch(() => null);
    }

    // ==================== SISTEMA DE ACEITAR / RECUSAR ====================

    // Ação: Botão Aceitar 
    if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
        const alvoId = interaction.customId.split('_')[1];
        const membroAlvo = await interaction.guild.members.fetch(alvoId).catch(() => null);
        const embedAntigo = interaction.message.embeds[0];

        const embedAceito = EmbedBuilder.from(embedAntigo)
            .setColor("#248046")
            .addFields({ name: 'FUNCIONAL ACEITA:', value: `• A funcional foi aceita por: ${interaction.user}` });

        const botaoDesabilitado = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('func_aceita').setLabel('A funcional foi aceita').setStyle(ButtonStyle.Success).setDisabled(true)
        );

        await interaction.update({ embeds: [embedAceito], components: [botaoDesabilitado] }).catch(() => null);

        if (membroAlvo) {
            const campoNome = embedAntigo.fields.find(f => f.name === 'Personagem:')?.value.replace(/```/g, '').trim() || '';
            const campoPassaporte = embedAntigo.fields.find(f => f.name === 'Passaporte:')?.value.replace(/```/g, '').trim() || '';
            const campoCargo = embedAntigo.fields.find(f => f.name === 'Cargo requisitado:')?.value.toLowerCase().replace(/```/g, '').trim() || '';
            const campoUnidade = embedAntigo.fields.find(f => f.name === 'Guarnição solicitada:')?.value.toLowerCase().replace(/```/g, '').trim() || '';

            // Modifica o Nickname para o padrão exato: Nome Sobrenome - Passaporte
            if (campoNome && campoPassaporte) {
                const novoNickFormatado = `${campoNome} - ${campoPassaporte}`;
                await membroAlvo.setNickname(novoNickFormatado).catch(err => {
                    console.error(`⚠️ Sem permissão hierárquica para alterar o nome de ${membroAlvo.user.tag}:`, err.message);
                });
            }

            // Entrega os cargos configurados de forma integrada
            await membroAlvo.roles.add(CONFIG.CARGO_POLICIA_FEDERAL).catch(() => null);

            for (const [key, id] of Object.entries(CONFIG.CARGOS)) {
                const nomeFormatadoCargo = key.replace(/_/g, ' ');
                if (campoCargo.includes(nomeFormatadoCargo) || nomeFormatadoCargo.includes(campoCargo)) {
                    await membroAlvo.roles.add(id).catch(() => null);
                }
            }

            for (const [key, id] of Object.entries(CONFIG.UNIDADES)) {
                if (campoUnidade.includes(key) || key.includes(campoUnidade)) {
                    await membroAlvo.roles.add(id).catch(() => null);
                }
            }
        }

        const canalLogs = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS);
        if (canalLogs) {
            const logEmbed = new EmbedBuilder()
                .setTitle("🟢 Log - Funcional Aprovada")
                .setColor("#248046")
                .addFields(
                    { name: "Membro:", value: `<@${alvoId}> (\`${alvoId}\`)` },
                    { name: "Aprovado Por:", value: `${interaction.user}` },
                    { name: "Data/Hora (São Paulo):", value: `\`${getSPTimestamp()}\`` }
                );
            await canalLogs.send({ embeds: [logEmbed] }).catch(() => null);
        }
    }

    // Ação: Botão Recusar
    if (interaction.isButton() && interaction.customId.startsWith('reprovar_')) {
        if (interaction.replied || interaction.deferred) return;
        try {
            const alvoId = interaction.customId.split('_')[1];

            const modalMotivo = new ModalBuilder()
                .setCustomId(`modal_recusa_${alvoId}`)
                .setTitle('Motivo da Rejeição');

            const inputMotivo = new TextInputBuilder()
                .setCustomId('txt_motivo_recusa')
                .setLabel('Escreva o motivo da recusa:')
                .setRequired(true)
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Exemplo: Informações inválidas.');

            modalMotivo.addComponents(new ActionRowBuilder().addComponents(inputMotivo));
            await interaction.showModal(modalMotivo);
            return;
        } catch (err) {
            console.error("⚠️ Erro controlado ao abrir modal de recusa:", err.message);
            return;
        }
    }

    // Envio do Modal de Recusa
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('modal_recusa_')) {
        const alvoId = interaction.customId.split('_')[2];
        const motivo = interaction.fields.getTextInputValue('txt_motivo_recusa');
        const embedAntigo = interaction.message.embeds[0];

        const embedRecusado = EmbedBuilder.from(embedAntigo)
            .setColor("#da373c")
            .addFields(
                { name: 'FUNCIONAL NEGADA:', value: `• A funcional foi negada por: ${interaction.user}` },
                { name: 'Motivo:', value: `\`\`\`${motivo}\`\`\`` }
            );

        const botaoDesabilitado = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('func_negada').setLabel('A funcional foi negada').setStyle(ButtonStyle.Danger).setDisabled(true)
        );

        await interaction.update({ embeds: [embedRecusado], components: [botaoDesabilitado] }).catch(() => null);

        const canalLogs = interaction.guild.channels.cache.get(CONFIG.CANAL_LOGS);
        if (canalLogs) {
            const logEmbed = new EmbedBuilder()
                .setTitle("🔴 Log - Funcional Recusada")
                .setColor("#da373c")
                .addFields(
                    { name: "Membro:", value: `<@${alvoId}>` },
                    { name: "Recusado Por:", value: `${interaction.user}` },
                    { name: "Motivo:", value: `\`\`\`${motivo}\`\`\`` },
                    { name: "Data/Hora (São Paulo):", value: `\`${getSPTimestamp()}\`` }
                );
            await canalLogs.send({ embeds: [logEmbed] }).catch(() => null);
        }
    }
});

client.login(process.env.TOKEN);