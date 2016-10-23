process.env.NODE_ENV = 'development';

var express = require('express'),
    storyboard = require('storyboard'),
    morgan = require('morgan'),
    Promise = require('bluebird');

var story = storyboard.mainStory,
    app = express();

storyboard.addListener(require('storyboard/lib/listeners/console').default);

Promise.config({warnings: false});

if (process.env.NODE_ENV === 'development') {
    app.set('json spaces', 4);
}

app.set('trust proxy', 'loopback');

app.use(morgan('short', {
    stream: {
        write: (toLog)=> {
            story.info('http', toLog.replace('\n', ''));
        }
    }
}));

app.use((req, res, next)=> {
    res.set({
        'X-Robots-Tag': 'noindex',
        'Access-Control-Allow-Origin': req.get('origin') || '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Headers': 'authorization,origin,x-requested-with,content-type,DNT,keep-alive,Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Vary': 'Origin'
    });
    if (req.method !== 'OPTIONS') next();
    else {
        res.set('Access-Control-Max-Age', 1728000);
        res.status(204).end();
    }
});

app.use('/api/v1', require('./v1/index'));

app.use((req, res)=> {
    res.status(404).json({msg: 'Choose API-Version', version: {1: '/api/v1'}});
});

app.listen(4298);