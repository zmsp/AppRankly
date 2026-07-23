class InputParamsModel {
  constructor({ keyFilePath, packageName, projectID, bucketName }) {
    this.keyFilePath = keyFilePath;
    this.packageName = packageName;
    this.projectID = projectID;
    this.bucketName = bucketName;
  }
}

module.exports = InputParamsModel;
