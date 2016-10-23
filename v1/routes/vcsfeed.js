var app = require('express').Router();

var db = require('../../db');
var middleware = require('../middleware');

app.head('/:id', middleware.cors(['__none__']), (req, res)=> {
    res.status(200).end()
});

app.post('/:id', (req, res)=> {
    db.models.VCSFeed.find({where: {id: req.params.id}}).then(feed=> {
        if (feed !== undefined && feed !== null) {
            var type = function (queryparam) {
                if (['github', 'gitlab'].includes(queryparam))return queryparam;
                else if (req.get('user-agent').contains('GitHub-Hookshot') || req.get('X-Gitlab-Event') !== undefined)return 'github';
                else if (req.get('x-gitlab-event') !== undefined)return 'gitlab';
                else return null;
            }(req.query.type);
            if (type === 'github') {
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
            } else if (type === 'gitlab') {
                if (['Push Hook'].includes(req.get('X-Gitlab-Event'))) {
                    feed.getChannel().then(channel=> {
                        db.sendEvent('gitlabUpdate', {
                            payload: req.body,
                            event: req.get('X-Gitlab-Event'),
                            channel: channel.cid
                        });
                    });
                }
            } else res.status(400).json({error: 'source not identifiable'});
        } else res.status(404).json({error: 'webhook not found'});
    });
});

module.exports = app;