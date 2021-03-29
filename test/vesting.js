const Token = artifacts.require("Token");
const Vesting = artifacts.require("Vesting");
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { assert, expect } = require('chai');
const timeMachine = require('ganache-time-traveler');

const BNtoInt = function myFunction(num) {
  return parseInt(num.toString());
}

const toBeWithinOf = function toBeWithinOf(a,b,c) {
  a = BNtoInt(a);
  b = BNtoInt(b);
  return Math.abs(a-b) <= c;
}

contract('Vesting: Start', (accounts) => {
  let vestingInstance;
  let currentTime;

  beforeEach('setup grants for test', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(1000), new BN(0), new BN(0), new BN(10000), new BN(10000), { from: accounts[0] });

    vestingInstance = await Vesting.new(token.address);
    await token.transfer(vestingInstance.address, new BN(1000), { from: accounts[0]})

    // function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration)
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
    
    // function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime)
    currentTime = Math.floor((new Date()).getTime() / 1000);
    await vestingInstance.vestTokens(accounts[1], 1000, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] });
  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should throw error if trying to vest tokens to existing beneficiary', async () => {
    await expectRevert(vestingInstance.vestTokens(accounts[1], 5, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] }), "TokenVesting: beneficiary already exists");
  });

  it('should throw error if trying to allot more tokens than available', async () => {
    await expectRevert(vestingInstance.vestTokens(accounts[2], 5, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] }), "TokenVesting: Total amount allocated should be less than tokens in contract");
  });

  it('should return start time of allotted tokens to an address correctly ', async () => {
    startTime = await vestingInstance.startTime(accounts[1]);
    assert.strictEqual(startTime.toString(), currentTime.toString());
  });

  it('should return cliff of allotted tokens to an address correctly ', async () => {
    cliff = await vestingInstance.cliff(accounts[1]);
    assert.strictEqual(cliff.toString(), "2000" );
  });

  it('should return duration of allotted tokens to an address correctly ', async () => {
    duration = await vestingInstance.duration(accounts[1]);
    assert.strictEqual(duration.toString(), "3000" );
  });

  it('should return amount of allotted tokens to an address correctly ', async () => {
    amount = await vestingInstance.amount(accounts[1]);
    assert.strictEqual(amount.toString(), "1000" );
  });

  it('should return released amount of allotted tokens to an address correctly ', async () => {
    released = await vestingInstance.releasedAmount(accounts[1]);
    assert.strictEqual(released.toString(), "0" );
  });

  it('should return vested amount of allotted tokens to an address correctly ', async () => {
    vestedAmount = await vestingInstance.vestedAmount(accounts[1]);
    assert.strictEqual(vestedAmount.toString(), "0" );
  });

  it('should return releasable amount of allotted tokens to an address correctly ', async () => {
    releasable = await vestingInstance.releasableAmount(accounts[1]);
    assert.strictEqual(releasable.toString(), "0" );
  });

});

contract('Vesting: Mid cliff', (accounts) => {
  let token;
  let vestingInstance;
  let currentTime;

  // it('setup grants for test', async function () {
  beforeEach('setup grants for test', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(1000), new BN(0), new BN(0), new BN(10000), new BN(10000), { from: accounts[0] });

    vestingInstance = await Vesting.new(token.address);
    await token.transfer(vestingInstance.address, new BN(1000), { from: accounts[0]})

    // function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration)
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
    
    // function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime)
    currentTime = Math.floor((new Date()).getTime() / 1000);
    await vestingInstance.vestTokens(accounts[1], 1000, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] });
    // console.log(currentTime.toString());
    // console.log((await vestingInstance.getBlock()).toString());

    await timeMachine.advanceTimeAndBlock(1000);
  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should return amount of allotted tokens to an address correctly ', async () => {
    amount = await vestingInstance.amount(accounts[1]);
    assert.strictEqual(amount.toString(), "1000" );
  });

  it('should return released amount of allotted tokens to an address correctly ', async () => {
    released = await vestingInstance.releasedAmount(accounts[1]);
    assert.strictEqual(released.toString(), "0" );
  });

  it('should return releasable amount of allotted tokens to an address correctly ', async () => {
    releasable = await vestingInstance.releasableAmount(accounts[1]);
    assert.strictEqual(releasable.toString(), "0" );
  });

  it('should return vested amount of allotted tokens to an address correctly ', async () => {
    vestedAmount = await vestingInstance.vestedAmount(accounts[1]);
    assert.strictEqual(vestedAmount.toString(), "0" );
  });

  it('should release tokens correctly after some given period', async () => {
    await expectRevert(vestingInstance.release.call(accounts[1], { from: accounts[0] }), "TokenVesting: no tokens are due");
    newBalance = await token.balanceOf(accounts[1]);
    assert.strictEqual(newBalance.toString(), "0" );
  });
});

contract('Vesting: Post cliff', (accounts) => {
  let token;
  let vestingInstance;
  let currentTime;

  // it('setup grants for test', async function () {
  beforeEach('setup grants for test', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(1000), new BN(0), new BN(0), new BN(10000), new BN(10000), { from: accounts[0] });

    vestingInstance = await Vesting.new(token.address);
    await token.transfer(vestingInstance.address, new BN(1000), { from: accounts[0]});

    // function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration)
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
    
    // function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime)
    currentTime = Math.floor((new Date()).getTime() / 1000);
    await vestingInstance.vestTokens(accounts[1], 1000, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] });
    // console.log(currentTime.toString());
    // console.log((await vestingInstance.getBlock()).toString());

    await timeMachine.advanceTimeAndBlock(2500);
  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should return amount of allotted tokens to an address correctly ', async () => {
    amount = await vestingInstance.amount(accounts[1]);
    assert.strictEqual(amount.toString(), "1000" );
  });

  it('should return released amount of allotted tokens to an address correctly ', async () => {
    released = await vestingInstance.releasedAmount(accounts[1]);
    assert.strictEqual(released.toString(), "0" );
  });

  it('should return releasable amount of allotted tokens to an address correctly ', async () => {
    releasable = await vestingInstance.releasableAmount(accounts[1]);
    // console.log(releasable.toString());
    assert.strictEqual(releasable.toString(), "166" ); // 500/3000*1000 = 833.33
  });

  it('should return vested amount of allotted tokens to an address correctly ', async () => {
    vestedAmount = await vestingInstance.vestedAmount(accounts[1]);
    // console.log(vestedAmount.toString());
    assert.strictEqual(vestedAmount.toString(), "166" );
  });

  it('should release tokens correctly after some given period', async () => {
    await vestingInstance.release(accounts[1], { from: accounts[0] });
    newBalance = await token.balanceOf(accounts[1]);
    // console.log(newBalance.toString());
    assert.strictEqual(newBalance.toString(), "166" );
  });
});

contract('Vesting: Post cliff second release', (accounts) => {
  let token;
  let vestingInstance;
  let currentTime;

  // it('setup grants for test', async function () {
  beforeEach('setup grants for test', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(1000), new BN(0), new BN(0), new BN(10000), new BN(10000), { from: accounts[0] });

    vestingInstance = await Vesting.new(token.address);
    await token.transfer(vestingInstance.address, new BN(1000), { from: accounts[0]});

    // function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration)
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
    
    // function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime)
    currentTime = Math.floor((new Date()).getTime() / 1000);
    await vestingInstance.vestTokens(accounts[1], 1000, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] });
    // console.log(currentTime.toString());
    // console.log((await vestingInstance.getBlock()).toString());

    await timeMachine.advanceTimeAndBlock(2500);
    
    await vestingInstance.release(accounts[1], { from: accounts[0] });

    await timeMachine.advanceTimeAndBlock(250);
  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should return amount of allotted tokens to an address correctly ', async () => {
    amount = await vestingInstance.amount(accounts[1]);
    assert.strictEqual(amount.toString(), "1000" );
  });

  it('should return released amount of allotted tokens to an address correctly ', async () => {
    released = await vestingInstance.releasedAmount(accounts[1]);
    assert(toBeWithinOf(released, new BN(166), 1));
  });

  it('should return releasable amount of allotted tokens to an address correctly ', async () => {
    releasable = await vestingInstance.releasableAmount(accounts[1]);
    // console.log(releasable.toString());
    assert(toBeWithinOf(releasable, new BN(84), 1)); // 750/3000*1000 - 166 = 84
  });

  it('should return vested amount of allotted tokens to an address correctly ', async () => {
    vestedAmount = await vestingInstance.vestedAmount(accounts[1]);
    // console.log(vestedAmount.toString());
    assert(toBeWithinOf(vestedAmount, new BN(250), 1)); // 750/3000*1000 = 250
  });

  it('should release tokens correctly after some given period', async () => {
    await vestingInstance.release(accounts[1], { from: accounts[0] });
    newBalance = await token.balanceOf(accounts[1]);
    // console.log(newBalance.toString());
    assert(toBeWithinOf(newBalance, new BN(250), 1)); // 750/3000*1000 = 250
  });
});

contract('Vesting: Post vesting duration', (accounts) => {
  let token;
  let vestingInstance;
  let currentTime;

  // it('setup grants for test', async function () {
  beforeEach('setup grants for test', async function () {
    let snapshot = await timeMachine.takeSnapshot();
    snapshotId = snapshot['result'];

    token = await Token.new(new BN(1000), new BN(0), new BN(0), new BN(10000), new BN(10000), { from: accounts[0] });

    vestingInstance = await Vesting.new(token.address);
    await token.transfer(vestingInstance.address, new BN(1000), { from: accounts[0]});

    // function addVestingGrant(string memory grantName, uint256 cliff, uint256 duration)
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
    await vestingInstance.addVestingGrant(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
    
    // function vestTokens(address beneficiary, uint256 amount, string memory grantName, uint256 startTime)
    currentTime = Math.floor((new Date()).getTime() / 1000);
    await vestingInstance.vestTokens(accounts[1], 1000, web3.utils.fromUtf8("founders"), currentTime, { from: accounts[0] });
    // console.log(currentTime.toString());
    // console.log((await vestingInstance.getBlock()).toString());

    await timeMachine.advanceTimeAndBlock(5500);
  })

  afterEach(async() => {
    await timeMachine.revertToSnapshot(snapshotId);
  });

  it('should return releasable amount of allotted tokens to an address correctly ', async () => {
    releasable = await vestingInstance.releasableAmount(accounts[1]);
    // console.log(releasable.toString());
    assert(toBeWithinOf(releasable, new BN(1000), 0)); 
  });

  it('should return vested amount of allotted tokens to an address correctly ', async () => {
    vestedAmount = await vestingInstance.vestedAmount(accounts[1]);
    // console.log(vestedAmount.toString());
    assert(toBeWithinOf(vestedAmount, new BN(1000), 0));
  });

  it('should release tokens correctly after some given period (owner)', async () => {
    await vestingInstance.release(accounts[1], { from: accounts[0] });
    newBalance = await token.balanceOf(accounts[1]);
    // console.log(newBalance.toString());
    assert(toBeWithinOf(newBalance, new BN(1000), 0));
  });

  it('should release tokens correctly after some given period (user)', async () => {
    await vestingInstance.release(accounts[1], { from: accounts[1] });
    newBalance = await token.balanceOf(accounts[1]);
    // console.log(newBalance.toString());
    assert(toBeWithinOf(newBalance, new BN(1000), 0));
  });

  it('should not release tokens if not invoked by owner or user', async () => {
    await expectRevert.unspecified(vestingInstance.release(accounts[1], { from: accounts[2] }));
  });

});

// SAMPLE CODE 

// contract(' time tests sample ', async (accounts) =>  {
//   let vestingInstance;

//   beforeEach(async() => {
//       let snapshot = await timeMachine.takeSnapshot();
//       snapshotId = snapshot['result'];
//   });

//   afterEach(async() => {
//       await timeMachine.revertToSnapshot(snapshotId);
//   });

//   before('Deploy Contract', async() => {
//       token = await Token.new(new BN(1000), { from: accounts[0] });
//       vestingInstance = await Vesting.new(token.address);
//       vestingInstance.addVestingGrant.call(web3.utils.fromUtf8("private_sale"), 1000, 2000, { from: accounts[0] });
//       vestingInstance.addVestingGrant.call(web3.utils.fromUtf8("founders"), 2000, 3000, { from: accounts[0] });
//   });

//   /* ADD TESTS HERE */

//   it('should vest tokens to an address correctly', async () => {
//       await timeMachine.advanceTimeAndBlock(1000);

//   });
// });

// contract('Vesting time tests', async (accounts) =>  {
//   let vestingInstance;

//   it('Deploy Contract', async() => {
//     token = await Token.new(new BN(1000), { from: accounts[0] });
//     vestingInstance = await Vesting.new(token.address);
    
//     let date = (new Date()).getTime();
//     let birthDateInUnixTimestamp = Math.floor(date / 1000);
//     console.log(birthDateInUnixTimestamp);
//     await vestingInstance.set(birthDateInUnixTimestamp);

//     birthDateInUnixTimestamp = await vestingInstance.get();
//     console.log(birthDateInUnixTimestamp.toString());
//     console.log((await vestingInstance.getBlock()).toString());
//     await timeMachine.advanceTimeAndBlock(1000);
//     console.log((await vestingInstance.getBlock()).toString());
//     let date2 = new Date(birthDateInUnixTimestamp * 1000);
//     console.log(date2);

//   });

// });
