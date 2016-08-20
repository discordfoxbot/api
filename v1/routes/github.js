var app = require('express').Router();

var db = require('../../db');

app.post('/:id', (req, res)=> {
    db.models.GithubFeed.find({where: {id: req.params.id}}).then(feed=> {
        if (feed !== undefined && feed !== null) {
            if (feed.last_event !== req.get('X-GitHub-Delivery')) {
                res.status(204).end();
                feed.update({last_event: req.get('X-GitHub-Delivery')});
               if(['push','watch'].includes(req.get('X-GitHub-Event'))){
                   feed.getChannel().then(channel=> {
                       db.sendEvent('githubUpdate', {
                           payload: req.body,
                           event: req.get('X-GitHub-Event'),
                           channel: channel.cid
                       });
                   });
               }
            } else res.status(409).json({error: 'duplicate event'});
        } else res.status(404).json({error: 'webhook not found'});
    });
});

module.exports = app;