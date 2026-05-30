const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

// ================== MOTOR DO FIREBASE ==================
const admin = require('firebase-admin');

// Lê a chave do Railway
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore(); // <--- ISSO FALTAVA AQUI!

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
        "PF": "1471978146742927673", "PM": "1471995584247496714", "PC": "1471995583223959634",
        "PRF": "1471995581894230119", "EB": "1471995582389424311", "GCM": "1471995584826052750",
        "RF": "1471995586302705726", "PREF": "1471983935750799421"
    }
};

client.once('ready', () => {
    console.log(`✅ Agente Federal: Sistema Online | Direção Geral: Miguel Fernandes`);
});

// Adicione isto antes do client.login
console.log("--- DEBUG DE CONEXÃO ---");
console.log("Variável TOKEN existe?", process.env.TOKEN ? "Sim" : "Não");
console.log("Tamanho do Token:", process.env.TOKEN ? process.env.TOKEN.length : 0);
console.log("------------------------");

client.login(process.env.TOKEN);

// [RESTANTE DO SEU CÓDIGO PERMANECE IGUAL AQUI...]
// (Certifique-se de colar o restante da sua lógica abaixo deste ponto)

client.login(process.env.TOKEN);