const Token = artifacts.require("Token");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');

contract('Token', (accounts) => {
  let token;

  const tokenOwner = accounts[0];
  const mintReciever = accounts[1];

  beforeEach("get deployed token", async function () {
    token = await Token.new(new BN(10), { from: tokenOwner });
  });

  it('has a name', async function () {
    const name = await token.name();
    assert.equal(name, 'Delta Token');
  });

  it('has a symbol', async function () {
    const symbol = await token.symbol();
    assert.equal(symbol, 'DETO');
  });

  it('has 18 decimals', async function () {
    const decimals = await token.decimals();
    assert.strictEqual(decimals.toNumber(), 18);
  }); 

  it('should start with initial supply correctly', async () =>{
    const totalSupply = await token.totalSupply();
    const creatorBalance = await token.balanceOf(tokenOwner);
    const initialSupply = new BN(10);

    expect(creatorBalance).to.be.bignumber.equal(initialSupply);
    expect(totalSupply).to.be.bignumber.equal(initialSupply);
    assert.strictEqual(creatorBalance.toString(), totalSupply.toString());
  })

  it('should transfer tokens to an address correctly ', async () => {
    user1 = accounts[2];
    user2 = accounts[3];
    await token.mint(user1, new BN(10), {
      from: tokenOwner
    });

    await token.transfer(user2, new BN(2), { from: user1})

    const user1Balance = await token.balanceOf(user1);
    const user2Balance = await token.balanceOf(user2);

    expect(user1Balance).to.be.bignumber.equal(new BN(8));
    expect(user2Balance).to.be.bignumber.equal(new BN(2));
  });

  it('should mint tokens to an address correctly ', async () => {
    const userTokenBefore = await token.balanceOf(mintReciever);
    const mintReciept = await token.mint(mintReciever, web3.utils.toWei("10"), {
      from: tokenOwner
    });
    const userTokenAfter = await token.balanceOf(mintReciever);
    var difference = (userTokenAfter / (10 ** 18)) - (userTokenBefore / (10 ** 18));
    assert.strictEqual(difference.toString(), "10");
  });

  it('should not be able to mint tokens after reaching hardcap ', async () => {
    token2 = await Token.new(web3.utils.toWei("1000000"), { from: tokenOwner });
    await token2.mint(mintReciever, web3.utils.toWei("99000000"), {
      from: tokenOwner
    });
    await expectRevert(token2.mint(mintReciever, web3.utils.toWei("1"), {
      from: tokenOwner
    }), 'ERC20Capped: cap exceeded');
  });

  it('cannot mint if not owner', async function () {
    await expectRevert(
      token.mint(mintReciever, web3.utils.toWei("10"), {
        from: accounts[1]
      }), 'MinterRole: caller does not have the Minter role')
  });

});
