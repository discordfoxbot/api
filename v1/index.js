var app = require('express').Router();

app.use((req, res, next)=> {
    res.apijson = (data, meta)=> {
        meta = meta || {};
        res.json({
            data,
            count: (Array.isArray(data) ? data.length : undefined),
            total: meta.total || undefined,
            next: meta.next || undefined,
            time: new Date()
        })
    };
    next();
});

app.use('/characters', require('./routes/characters'));
app.use('/chatlogs', require('./routes/chatlogs'));

module.exports = app;