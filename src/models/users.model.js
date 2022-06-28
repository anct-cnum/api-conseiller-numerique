module.exports = function(app) {
  const modelName = 'users';
  const mongooseClient = app.get('mongooseClient');
  
  const schema = new mongooseClient.Schema(
    {
      name: { type: String, required: true },
      password: { type: String, required: true },
      roles: { type: Array },
      entity: { type: Array },
      token: { type: String },
      resend: { type: Boolean },
      mailAModifier: { type: String },
      mailConfirmError: { type: String },
      mailConfirmErrorDetail: { type: String },
      mailCoopSent: { type: Boolean },
      mailSentDate: { type: Date },
      tokenCreatedAt: { type: Date },
      passwordCreated: { type: Boolean },
    },
    {
      timestamps: true,
    }
  );

  // This is necessary to avoid model compilation errors in watch mode
  // see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
  if (mongooseClient.modelNames().includes(modelName)) {
    mongooseClient.deleteModel(modelName);
  }
  return mongooseClient.model(modelName, schema);
};
