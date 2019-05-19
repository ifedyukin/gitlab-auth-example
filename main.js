const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const { PORT, APPLICATION_ID, SECRET, HOST } = process.env;
const GitLabApp = { APPLICATION_ID, SECRET };
const redirectUri = `${HOST}/api/gitlab/callback`;

function getStateHash() {
    const date = new Date().getTime()
    const salt = Math.round(Math.random() * 100);
    return `${salt}_${date}`;
}

function userCard(user) {
    return `
        <div>
            <img src="${user.avatar_url}" alt="avatar" /><br />
            <span><b>id: </b>${user.id}</span><br />
            <span><b>name: </b>${user.name}</span><br />
            <span><b>username: </b>${user.username}</span><br />
            <span><b>email: </b>${user.public_email}</span><br />
        </div>
    `;
}

const app = express();
app.use(bodyParser.json());

app.get('/api/gitlab/auth', async (req, res) => {
    const authUri = `https://gitlab.com/oauth/authorize?client_id=${GitLabApp.APPLICATION_ID}&redirect_uri=${redirectUri}&response_type=code&state=${getStateHash()}&scope=read_user`;
    res.redirect(authUri);
});

app.get('/api/gitlab/callback', async (req, res) => {
    const { code, state } = req.query;
    try {
        const tokenResponse = await axios.post(
            'https://gitlab.com/oauth/token',
            `client_id=${GitLabApp.APPLICATION_ID}&client_secret=${GitLabApp.SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}&scope=read_user`
        );
        const token = `${tokenResponse.data.token_type} ${tokenResponse.data.access_token}`;

        const userResponse = await axios({
            type: 'GET',
            url: 'https://gitlab.com/api/v4/user',
            headers: {
                Authorization: token
            }
        });

        res.send(userCard(userResponse.data));
    } catch (e) {
        console.error(e);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => console.log(`Express server is listening on ${PORT}`));
