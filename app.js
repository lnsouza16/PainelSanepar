const express = require('express');
const app = express();
app.use(express.static('public'));

let senha = 0;
let fila = [];
let filaPreferencial = [];
let filaNormal = [];
let chamadas = [];
let mesasComSenhasChamadas = {};
let mesasEmAtendimento = {};
let inicioAtendimento = {};
let todasAsMesas = {1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true, 9: true, 10: true};

// Adiciona a variável 'contadorSenhasMesa'
let contadorSenhasMesa = {};
for (let mesa in todasAsMesas) {
    contadorSenhasMesa[mesa] = 0;
}

// Função para formatar a hora
function formatarHora(data) {
    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');
    const segundos = data.getSeconds().toString().padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
}

app.get('/gerar_senha', (req, res) => {
    let senhaEspecifica = req.query.senha;
    let tipo = req.query.tipo;
    if (senhaEspecifica) {
        senha = senhaEspecifica;
    } else {
        senha++;
    }
    let horario = new Date();
    let horarioFormatado = formatarHora(horario);
    if (tipo === 'preferencial') {
        filaPreferencial.push({ senha: senha, horario: horarioFormatado });
    } else {
        filaNormal.push({ senha: senha, horario: horarioFormatado });
    }
    res.send(`Senha ${tipo} gerada: ${senha} às ${horarioFormatado}`);
});
// Altera a função '/chamar_senha()' para incrementar o contador de senhas da mesa
app.get('/chamar_senha', (req, res) => {
    let mesa = req.query.mesa;
    if (mesasComSenhasChamadas[mesa]) {
        res.send('Erro: Mesa já tem uma senha chamada');
    } else if (filaPreferencial.length === 0 && filaNormal.length === 0) {
        res.send('Nenhuma senha na fila');
    } else {
        let senhaChamada;
        if (filaPreferencial.length > 0) {
            senhaChamada = filaPreferencial.shift();
        } else {
            senhaChamada = filaNormal.shift();
        }
        mesasComSenhasChamadas[mesa] = senhaChamada.senha;
        todasAsMesas[mesa] = false;
        chamadas.push(`Senha ${senhaChamada.senha} / Mesa ${mesa}`);

        // Incrementa o contador de senhas da mesa
        contadorSenhasMesa[mesa]++;

        res.send(`Senha ${senhaChamada.senha} chamada na Mesa ${mesa}`);
    }
});

app.get('/cliente_chegou', (req, res) => {
    let mesa = req.query.mesa;
    if (mesasComSenhasChamadas[mesa]) {
        mesasEmAtendimento[mesa] = true;
        inicioAtendimento[mesa] = Date.now();
        let index = chamadas.findIndex((chamada) => chamada.includes(`Mesa ${mesa}`));
        if (index !== -1) {
            chamadas.splice(index, 1);
        }
        res.send(
            `Cliente com senha ${mesasComSenhasChamadas[mesa]} chegou na Mesa ${mesa} às ${formatarHora(new Date())}`
        );
    } else {
        res.send('Erro: Mesa não tem uma senha chamada');
    }
});

app.get('/cliente_atendido', (req, res) => {
    let mesa = req.query.mesa;
    if (mesasEmAtendimento[mesa]) {
        delete mesasComSenhasChamadas[mesa];
        delete mesasEmAtendimento[mesa];
        todasAsMesas[mesa] = true;
        res.send(`Mesa ${mesa} liberada para chamar outra senha`);
    } else {
        res.send('Erro: Mesa não está atendendo um cliente');
    }
});


app.get('/status_mesas', (req, res) => {
    let status = '<html><body>';

    for (let mesa in mesasComSenhasChamadas) {
        status += `<p>Mesa ${mesa}: `;
        if (!todasAsMesas[mesa]) {
            if (mesasEmAtendimento[mesa]) {
                let tempoAtendimento = Math.floor((Date.now() - inicioAtendimento[mesa]) / 1000); // Tempo em segundos
                const horas = Math.floor(tempoAtendimento / 3600).toString().padStart(2, '0');
                const minutos = Math.floor((tempoAtendimento % 3600) / 60).toString().padStart(2, '0');
                const segundos = (tempoAtendimento % 60).toString().padStart(2, '0');
                status += `Atendendo o cliente com a senha ${mesasComSenhasChamadas[mesa]} há ${horas}:${minutos}:${segundos}</p>`;
            } else {
                status += `Chamou a senha ${mesasComSenhasChamadas[mesa]}, mas o cliente ainda não chegou</p>`;
            }
        } else {
            status += `Está livre para chamar outra senha</p>`;
        }
    }

    // Adicione a contagem de senhas chamadas para cada mesa
    for (let i = 1; i <= 10; i++) {
        status += `<p>Número de senhas chamadas na mesa ${i}: <b>${contadorSenhasMesa[i]}</b></p>`;
    }

    status += '</body></html>';
    res.send(status);
});

app.get('/fila_senhas', (req, res) => {
    let senhasPreferenciais = filaPreferencial.map(item => `Senha preferencial ${item.senha} gerada às ${item.horario}`).join('<br>');
    let senhasNormais = filaNormal.map(item => `Senha normal ${item.senha} gerada às ${item.horario}`).join('<br>');
    res.send(`${senhasPreferenciais}<br>${senhasNormais}`);
});


app.get('/senhas_chamadas', (req, res) => {
    res.send(chamadas.join('<br>'));
});

app.get('/status_mesas', (req, res) => {
    let status = '';
    for (let mesa in mesasComSenhasChamadas) {
        status += `Mesa ${mesa}: `;
        if (mesasEmAtendimento[mesa]) {
            status += `Atendendo o cliente com a senha ${mesasComSenhasChamadas[mesa]}<br>`;
        } else {
            status += `Chamou a senha ${mesasComSenhasChamadas[mesa]}, mas o cliente ainda não chegou<br>`;
        }
    }
    res.send(status);
});

app.get('/status_mesa', (req, res) => {
    let mesa = req.query.mesa;
    if (mesasEmAtendimento[mesa]) {
        let tempoAtendimento = Math.floor((Date.now() - inicioAtendimento[mesa]) / 1000);
        res.send(`Mesa ${mesa} está atendendo o cliente com a senha ${mesasComSenhasChamadas[mesa]} há ${tempoAtendimento} segundos`);
    } else if (mesasComSenhasChamadas[mesa]) {
        res.send(`Mesa ${mesa} chamou a senha ${mesasComSenhasChamadas[mesa]}, mas o cliente ainda não chegou`);
    } else {
        res.send(`Mesa ${mesa} está livre para chamar outra senha`);
    }
});


app.listen(3000, () => console.log('Servidor rodando na porta 3000'));
