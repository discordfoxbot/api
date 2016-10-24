var app = require('express').Router();

app.get('/', (req, res)=> {
    res.apijson({
        msg:'Welcome to Kitsune-Api V1.',
        endpoints:{
            characters:'https://kitsune.fuechschen.org/api/v1/characters',
            chatlogs:'https://kitsune.fuechschen.org/api/v1/chatlogs',
            guilds:'https://kitsune.fuechschen.org/api/v1/guilds',
            stats:'https://kitsune.fuechschen.org/api/v1/stats',
            uptime_test:'https://kitsune.fuechschen.org/api/v1/stats/uptime_test',
            vcsfeeds:'https://kitsune.fuechschen.org/api/v1/vcsfeeds'
        }
    })
});

module.exports = app;