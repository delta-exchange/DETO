const Token = artifacts.require("Token");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');
const timeMachine = require('ganache-time-traveler');

const months18 = 1.5*365*24*3600;
const quarter = 0.25*365*24*3600;

contract('Token', (accounts) => {
  let token;

  const tokenOwner = accounts[0];
  const mintReciever = accounts[1];
  const currentTime = Math.floor((new Date()).getTime() / 1000);

  beforeEach("get deployed token", async function () {
    token = await Token.new(new BN(10), new BN(currentTime), new BN(0), new BN(100), new BN(1000), { from: tokenOwner });
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
    const mintReciept = await token.mint(mintReciever, new BN(10), {
      from: tokenOwner
    });
    const userTokenAfter = await token.balanceOf(mintReciever);
    var difference = userTokenAfter - userTokenBefore;
    assert.strictEqual(difference.toString(), "10");
  });

  it('should not be able to mint tokens after reaching hardcap ', async () => {
    token2 = await Token.new(web3.utils.toWei("1000000"),new BN(currentTime), new BN(0), web3.utils.toWei("1000000000"), web3.utils.toWei("1000000000"), { from: tokenOwner });
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

  it('should be able to burn', async () => {
    user1 = accounts[2];

    await token.transfer(user1, new BN(10), { from: tokenOwner});

    await token.burn(new BN(3), { from: user1});

    const totalSupply = await token.totalSupply();
    const user1Balance = await token.balanceOf(user1);

    expect(user1Balance).to.be.bignumber.equal(new BN(7));
    expect(totalSupply).to.be.bignumber.equal(new BN(7));
  });

});

contract('Token: Time tests', (accounts) => {
  let token;
  const tokenOwner = accounts[0];
  const mintReciever = accounts[1];
  const currentTime = Math.floor((new Date()).getTime() / 1000);

  beforeEach('setup', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(500), new BN(currentTime), new BN(months18), new BN(100), new BN(700), { from: accounts[0] });

  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should not allow minting before mint cliff', async () => {
    await timeMachine.advanceTimeAndBlock(months18-100);
    await expectRevert(token.mint(mintReciever, new BN(10), {
      from: tokenOwner
    }), 'No minting allowed before mint cliff');
  });

  it('should allow minting after mint cliff', async () => {
    await timeMachine.advanceTimeAndBlock(months18+1);
    const userTokenBefore = await token.balanceOf(mintReciever);
    const mintReciept = await token.mint(mintReciever, new BN(10), {
      from: tokenOwner
    });
    const userTokenAfter = await token.balanceOf(mintReciever);
    var difference = userTokenAfter - userTokenBefore;
    assert.strictEqual(difference.toString(), "10");
  });

  it('should return quarter start time correctly', async () => {
    await timeMachine.advanceTimeAndBlock(months18 + 30*24*3600);
    quarterStartTime = await token.getQuarterStartTime();
    assert.strictEqual(quarterStartTime.toString(), (currentTime + months18).toString());

    await timeMachine.advanceTimeAndBlock(quarter);
    nextQuarterStart = currentTime + months18 + quarter;
    quarterStartTime = await token.getQuarterStartTime();
    assert.strictEqual(quarterStartTime.toString(), nextQuarterStart.toString());
  });

  it('should not allow minting if exceeds quarter cap', async () => {
    await timeMachine.advanceTimeAndBlock(months18+1);
    const userTokenBefore = await token.balanceOf(mintReciever);
    const mintReciept = await token.mint(mintReciever, new BN(10), {
      from: tokenOwner
    });
    await expectRevert(token.mint(mintReciever, new BN(91), {
      from: tokenOwner
    }), 'Limit exceeded for minting this quarter');
  });

  it('should allow minting upto quarter cap in next quarter', async () => {
    await timeMachine.advanceTimeAndBlock(months18+1);
    await token.mint(mintReciever, new BN(100), {
      from: tokenOwner
    });

    await timeMachine.advanceTimeAndBlock(quarter);
    const userTokenBefore = await token.balanceOf(mintReciever);
    await token.mint(mintReciever, new BN(100), {
      from: tokenOwner
    });
    const userTokenAfter = await token.balanceOf(mintReciever);
    var difference = userTokenAfter - userTokenBefore;
    assert.strictEqual(difference.toString(), "100");
  });

  it('should not allow minting after minting cap has reached', async () => {
    await timeMachine.advanceTimeAndBlock(months18+1);
    await token.mint(mintReciever, new BN(100), {
      from: tokenOwner
    });

    await timeMachine.advanceTimeAndBlock(quarter);
    await token.mint(mintReciever, new BN(100), {
      from: tokenOwner
    });

    await timeMachine.advanceTimeAndBlock(quarter);
    await expectRevert(token.mint(mintReciever, new BN(1), {
      from: tokenOwner
    }), 'Mint cap reached');
  });

});
