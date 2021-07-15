const {
  expectRevert,
  constants,
  time,
  balance,
} = require("@openzeppelin/test-helpers");

const chai = require("chai");
const { expect } = chai;

const Subscriptionz = artifacts.require("Subscription.sol");
const Token = artifacts.require("MYToken.sol");

// Time Duration:
const THIRTY_DAYS = time.duration.days(30);
const FIFTY_DAYS = time.duration.days(50);

contract("Subscription", (addresses) => {
  const [admin, merchant, subscriber, externalActor] = addresses;
  let subscription, myToken;

  beforeEach(async () => {
    // Instantiate both contracts first:
    subscriptionContract = await Subscriptionz.new();
    myToken = await Token.new();

    // Get the accounts of each stakeholder up:
    await myToken.transfer(subscriber, 1000);

    // Approve spending on subscriber's behalf by the Subscription Smart Contract:
    await myToken.approve(subscriptionContract.address, 1000, {
      from: subscriber,
    });
  });

  // TEST CASES:
  it("Should create a subscription plan", async () => {
    await subscriptionContract.createPlan(myToken.address, 100, THIRTY_DAYS, {
      from: merchant,
    });

    // Instantiate the created plan from mapping:
    const firstPlan = await subscriptionContract.plans(0);

    expect(firstPlan.token).to.be.equal(myToken.address);
    expect(firstPlan.amount.toString()).to.be.equal("100");
    expect(firstPlan.frequency.toString()).to.be.equal(THIRTY_DAYS.toString());

    // 2nd contract test:
    await subscriptionContract.createPlan(myToken.address, 150, FIFTY_DAYS, {
      from: merchant,
    });

    // Instantiate the 2nd Created Plan from mapping:
    const secondPlan = await subscriptionContract.plans(1);

    expect(secondPlan.token).to.be.equal(myToken.address);
    expect(secondPlan.amount.toString()).to.be.equal("150");
    expect(secondPlan.frequency.toString()).to.be.equal(FIFTY_DAYS.toString());
  });

  it("Should FAIL to create a plan (null address / invalid amount/ invalid frequency)", async () => {
    // Zero Address:
    await expectRevert(
      subscriptionContract.createPlan(
        constants.ZERO_ADDRESS,
        100,
        THIRTY_DAYS,
        { from: merchant }
      ),
      "invalid, address should not be the null address"
    );

    // Invalid Amount:
    await expectRevert(
      subscriptionContract.createPlan(myToken.address, 0, THIRTY_DAYS, {
        from: merchant,
      }),
      "invalid amount"
    );

    // Invalid Frequency:
    await expectRevert(
      subscriptionContract.createPlan(myToken.address, 100, 0, {
        from: merchant,
      }),
      "frequency needs to be greater than 0"
    );
  });

  // Subscribe with payment:
  it("should subscribe and pay its subscription fee", async () => {
    // Creating subscription plan:
    await subscriptionContract.createPlan(myToken.address, 100, THIRTY_DAYS, {
      from: merchant,
    });

    // Subscribing:
    await subscriptionContract.subscribeToPlan(0, { from: subscriber });

    const merchantBalance = await myToken.balanceOf(merchant);
    const subscriberBalance = await myToken.balanceOf(subscriber);

    expect(merchantBalance.toString()).to.be.equal("100");
    expect(subscriberBalance.toString()).to.be.equal("900");

    // 1 Payment Cycle past (fast forward time) + 1 second:
    await time.increase(THIRTY_DAYS + 1);
    await subscriptionContract.pay(subscriber, 0, { from: subscriber });
    const merchantBalanceFC = await myToken.balanceOf(merchant);
    const subscriberBalanceFC = await myToken.balanceOf(subscriber);

    expect(merchantBalanceFC.toString()).to.be.equal("200");
    expect(subscriberBalanceFC.toString()).to.be.equal("800");

    // 2 Payment Cycles Past:
    await time.increase(THIRTY_DAYS + 1);
    await subscriptionContract.pay(subscriber, 0, { from: subscriber });
    const merchantBalanceSC = await myToken.balanceOf(merchant);
    const subscriberBalanceSC = await myToken.balanceOf(subscriber);

    expect(merchantBalanceSC.toString()).to.be.equal("300");
    expect(subscriberBalanceSC.toString()).to.be.equal("700");
  });

  it("should NOT pay when payment is NOT due yet", async () => {
    // Created plan from merchant:
    await subscriptionContract.createPlan(myToken.address, 100, FIFTY_DAYS, {
      from: merchant,
    });

    await subscriptionContract.subscribeToPlan(0, { from: subscriber });

    // Fast forward right before 1 payment cycle:
    await time.increase(FIFTY_DAYS - 1);
    await expectRevert(
      subscriptionContract.pay(subscriber, 0, { from: subscriber }),
      "Payment not due yet"
    );
  });

  // Cancelling subscription:
  it("Should cancel existing subscription", async () => {
    // Creating subscription plan:
    await subscriptionContract.createPlan(myToken.address, 100, THIRTY_DAYS, {
      from: merchant,
    });

    // Subscribing:
    await subscriptionContract.subscribeToPlan(0, { from: subscriber });

    // Cancelling:
    await subscriptionContract.cancelPlan(0, { from: subscriber });

    // Accessing Subscription Struc under user address to check if address subscriber === ZERO_ADDRESS
    const subscriptionSTRUC = await subscriptionContract.subscriptions(
      subscriber,
      0
    );

    expect(subscriptionSTRUC.subscriber).to.be.equal(constants.ZERO_ADDRESS);
  });
});
