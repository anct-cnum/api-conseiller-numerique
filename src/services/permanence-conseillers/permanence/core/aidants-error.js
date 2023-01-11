class AidantsError extends Error {
  constructor() {
    super('Il devrait y avoir au moins un aidant visible dans une permanence');
  }
}

module.exports = {
  AidantsError
};
