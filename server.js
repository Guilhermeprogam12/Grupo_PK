const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json({ limit: '50mb' }));

let client;

function iniciarCliente() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            // Argumentos de performance extrema
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--mute-audio',
                '--hide-scrollbars',
                '--disable-notifications',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-component-extensions-with-background-pages',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                '--disable-ipc-flooding-protection',
                '--force-color-profile=srgb',
                '--metrics-recording-only'
            ],
        }
    });

    client.on('qr', (qr) => {
        qrcode.toDataURL(qr, (err, url) => { io.emit('qr', url); });
    });

    client.on('ready', () => {
        console.log('✅ Shineray Conectada!');
        io.emit('ready', true);
    });

    client.initialize().catch(err => console.error("Erro na inicialização:", err));
}

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// Rota de Logout e Reset
app.post('/logout', async (req, res) => {
    try {
        await client.logout();
        await client.destroy();
        if (fs.existsSync('./.wwebjs_auth')) {
            fs.rmSync('./.wwebjs_auth', { recursive: true, force: true });
        }
        iniciarCliente();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/contacts', async (req, res) => {
    try {
        const contacts = await client.getContacts();
        const filtered = contacts
            .filter(c => c.isMyContact && c.id.server === 'c.us')
            .map(c => ({ id: c.id._serialized, name: c.name || c.pushname || 'Cliente Sem Nome' }))
            .sort((a, b) => a.name.localeCompare(b.name));
        res.json(filtered);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/send', async (req, res) => {
    const { number, message, media } = req.body;
    try {
        let chatId = number.replace(/\D/g, '');
        chatId = chatId.includes('@c.us') ? chatId : `${chatId}@c.us`;

        if (media && media.data) {
            const file = new MessageMedia(media.mimetype, media.data, media.filename);
            await client.sendMessage(chatId, file, { caption: message });
        } else {
            await client.sendMessage(chatId, message);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

iniciarCliente();
server.listen(3000, () => console.log('🚀 Turbo Shineray: http://localhost:3000'));
