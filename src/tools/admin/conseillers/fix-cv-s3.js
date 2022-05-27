const { execute } = require('../../utils');
const aws = require('aws-sdk');

execute(__filename, async ({ db, logger, exit, app }) => {

  const cvExists = await db.collection('conseillers').find({ 'cv.file': { '$exists': true } }).toArray();
  const awsConfig = app.get('aws');
  aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
  const ep = new aws.Endpoint(awsConfig.endpoint);
  const s3 = new aws.S3({ endpoint: ep });

  let coherenceOk = 0;
  let coherenceNotOk = 0;

  for (const conseiller of cvExists) {
    let params = { Bucket: awsConfig.cv_bucket, Key: conseiller.cv.file };/*  */
    try {
      await s3.getObject(params).promise();
      coherenceOk++;
    } catch (error) {
      if (error?.statusCode === 404) {
        await db.collection('conseillers').updateOne({ _id: conseiller._id }, { $unset: { cv: '' } });
      }
      coherenceNotOk++;
    }
  }

  logger.info(`${coherenceOk} était ok / ${coherenceNotOk} était pas ok`);
  exit();
});
