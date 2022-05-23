const { execute } = require('../../utils');
const aws = require('aws-sdk');

execute(__filename, async ({ db, logger, exit, app }) => {

  const cvExists = await db.collection('conseillers').find({ 'cv.file': { '$exists': true } }).toArray();
  const awsConfig = app.get('aws');
  aws.config.update({ accessKeyId: awsConfig.access_key_id, secretAccessKey: awsConfig.secret_access_key });
  const ep = new aws.Endpoint(awsConfig.endpoint);
  const s3 = new aws.S3({ endpoint: ep });

  let coherenceOk = 0;
  let coherenceNot = 0;

  for (const obj of cvExists) {
    let params = { Bucket: awsConfig.cv_bucket, Key: obj.cv.file };/*  */
    try {
      await s3.getObject(params).promise();
      coherenceOk++;
    } catch (error) {
      await db.collection('conseillers').updateOne({ _id: obj._id }, { $unset: { cv: '' } });
      coherenceNot++;
    }
  }

  logger.info(`${coherenceOk} était ok / ${coherenceNot} était pas ok`);
  exit();
});
