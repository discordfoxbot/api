var app = require('express').Router();

var db = require('../../lib/db');
var middleware = require('../middleware');

app.head('/:id', middleware.cors(['__none__']), (req, res)=> {
    res.status(200).end()
});

app.post('/:id', (req, res)=> {
    db.models.VCSFeed.find({where: {id: req.params.id}}).then(feed=> {
        if (feed !== undefined && feed !== null) {
                res.status(204).end();
                if (['Push Hook'].includes(req.get('X-Gitlab-Event'))) {
                    //noinspection JSUnresolvedFunction
                    feed.getChannel().then(channel=> {
                        db.sendEvent('gitlabUpdate', {
                            payload: req.body,
                            event: req.get('X-Gitlab-Event'),
                            channel: channel.cid
                        });
                    });
                }
        } else res.status(404).json({error: 'webhook not found'});
    });
});

module.exports = app;