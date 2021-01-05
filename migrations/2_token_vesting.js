const Token = artifacts.require("Token");
const Vesting = artifacts.require("Vesting");

module.exports = async function (deployer) {
  deployer.deploy(Token, 0, 0, 0, 0, 0).then(function() {
    return deployer.deploy(Vesting, Token.address);
  });
};
