var app = require('express').Router();

var db = require('../../db');

app.post('/:id', (req, res)=> {
    db.models.VCSFeed.find({where: {id: req.params.id}}).then(feed=> {
        if (feed !== undefined && feed !== null) {
            if (req.query.type === 'github') {
                res.status(204).end();
                if (feed.last_gh_event !== req.get('X-GitHub-Delivery')) {
                    feed.update({
                        last_gh_event: req.get('X-GitHub-Delivery')
                    });
                    if (['push', 'watch', 'pull_request'].includes(req.get('X-GitHub-Event'))) {
                        feed.getChannel().then(channel=> {
                            db.sendEvent('githubUpdate', {
                                payload: req.body,
                                event: req.get('X-GitHub-Event'),
                                channel: channel.cid
                            });
                        });
                    }
                }
            } else {
                if (['Push Hook'].includes(req.get('X-Gitlab-Event'))) {
                    feed.getChannel().then(channel=> {
                        db.sendEvent('gitlabUpdate', {
                            payload: req.body,
                            event: req.get('X-Gitlab-Event'),
                            channel: channel.cid
                        });
                    });
                }
            }
        } else res.status(404).json({error: 'webhook not found'});
    });
});

module.exports = app;