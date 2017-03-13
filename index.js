const Promise = require('bluebird');
const S3rver = require('s3rver');
const fs = require('fs');
const AWS = require('aws-sdk');

class ServerlessS3Local {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = 'aws';

    this.commands = {
      s3: {
        commands: {
          start: {
            usage: 'Start S3 local server.',
            lifecycleEvents: ['startHandler'],
            options: {
              port: {
                shortcut: 'p',
                usage: 'The port number that S3 will use to communicate with your application. If you do not specify this option, the default port is 4569',
              },
              directory: {
                shortcut: 'd',
                usage: 'The directory where S3 will store its objects. If you do not specify this option, the file will be written to the current directory.',
              },
              buckets: {
                shortcut: 'b',
                usage: 'After starting S3 local, craete specified buckets',
              },
            },
          },
        },
      },
    };

    this.hooks = {
      's3:start:startHandler': this.startHandler.bind(this),
      'before:offline:start': this.startHandler.bind(this),
      'before:simulate:lambda:start': this.startHandler.bind(this),
    };
  }

  startHandler() {
    return new Promise((resolve) => {
      const config = (this.serverless.service.custom && this.serverless.service.custom.s3) || {};
      const options = Object.assign({}, this.options, config);

      const buckets = options.buckets || [];
      const port = options.port || 4569;
      const hostname = 'localhost';
      const silent = false;
      const directory = options.directory || fs.realpathSync('./');
      new S3rver({ port, hostname, silent, directory }).run((err, s3Host, s3Port) => {
        if (err) {
          console.error('Error occured while starting S3 local.');
          return;
        }

        console.log(`S3 local started ( port:${s3Port} )`);

        const s3Client = new AWS.S3({
          s3ForcePathStyle: true,
          endpoint: new AWS.Endpoint(`http://localhost:${s3Port}`),
        });
        buckets.forEach((bucket) => {
          s3Client.createBucket({ Bucket: bucket }, () => {});
        });
      });

      resolve();
    });
  }
}

module.exports = ServerlessS3Local;
