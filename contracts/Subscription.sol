// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Subscription {
    uint256 public nextSubPlanID;

    struct Plan {
        address payable merchant;
        address token;
        uint256 amount;
        uint256 frequency;
    }

    struct Subscription {
        address subscriber;
        uint256 startTime;
        uint256 nextPaymentTime;
        bool active;
    }

    // Mappings:
    mapping(uint256 => Plan) public plans; //ID --> Plan
    mapping(address => mapping(uint256 => Subscription)) public subscriptions; //user --> has indexes of various subscriptions

    // Events:
    event PlanCreated(address merchant, uint256 planID, uint256 date);

    event SubscriptionCreated(address subscriber, uint256 planID, uint256 date);

    event SubscriptionCancelled(
        address subscriber,
        uint256 planID,
        uint256 date
    );

    event PaymentDetails(
        address from,
        address to,
        uint256 amount,
        uint256 planID,
        uint256 date
    );

    // Creating a subscription plan as a merchant:
    function createPlan(
        address _token,
        uint256 _amount,
        uint256 _frequency
    ) external {
        require(
            _token != address(0),
            "invalid, address should not be the null address"
        );
        require(_amount > 0, "invalid amount");
        require(_frequency > 0, "frequency needs to be greater than 0");

        plans[nextSubPlanID] = Plan(
            payable(msg.sender),
            _token,
            _amount,
            _frequency
        );

        emit PlanCreated(msg.sender, nextSubPlanID, block.timestamp);

        // Increment index:
        nextSubPlanID++;
    }

    function subscribeToPlan(uint256 _planID) external {
        IERC20 token = IERC20(plans[_planID].token); // instantiate token chosen
        Plan storage chosenPlan = plans[_planID]; // instantiate right plan chosen

        require(chosenPlan.merchant != address(0), "this plan does not exists");

        // Transfer first before subscribing:
        token.transferFrom(msg.sender, chosenPlan.merchant, chosenPlan.amount);

        emit PaymentDetails(
            msg.sender,
            chosenPlan.merchant,
            chosenPlan.amount,
            _planID,
            block.timestamp
        );

        subscriptions[msg.sender][_planID] = Subscription(
            msg.sender,
            block.timestamp,
            block.timestamp + chosenPlan.frequency,
            true
        );

        emit SubscriptionCreated(msg.sender, _planID, block.timestamp);
    }

    function cancelPlan(uint256 _planID) external {
        // Instantiate existing Subscription struct using subscription mapping:
        Subscription storage currentSubscription = subscriptions[msg.sender][
            _planID
        ];
        require(
            currentSubscription.subscriber != address(0),
            "This subscription does not exist"
        );

        delete subscriptions[msg.sender][_planID];

        emit SubscriptionCancelled(msg.sender, _planID, block.timestamp);
    }

    // Anyone can pay
    function pay(address _subscriber, uint256 _planID) external {
        // Instantiate existing subscription:
        Subscription storage currentSubscription = subscriptions[_subscriber][
            _planID
        ];
        Plan storage currentPlan = plans[_planID];

        // Instantiate the token of the plan:
        IERC20 token = IERC20(currentPlan.token);
        require(
            currentSubscription.subscriber != address(0),
            "this subscription does not exist"
        );
        require(
            block.timestamp > currentSubscription.nextPaymentTime,
            "Payment not due yet"
        );

        // Transfering token:
        token.transferFrom(
            _subscriber,
            currentPlan.merchant,
            currentPlan.amount
        );

        emit PaymentDetails(
            _subscriber,
            currentPlan.merchant,
            currentPlan.amount,
            _planID,
            block.timestamp
        );

        // Update the NEXT PAYMENT DATE:
        currentSubscription.nextPaymentTime += currentPlan.frequency;
    }

    // Helper Functions:
    // function getAllPlans() public view returns (Plan[] memory) {
    //     Plan[] memory allPlanArray;

    //     for (uint256 i = 0; i < nextSubPlanID; i++) {
    //         allPlanArray.push(plans[i]);
    //     }

    //     return allPlanArray;
    // }

    function getPlan(uint256 _planID) public view returns (Plan memory) {
        return plans[_planID];
    }

    // function getAllSubscriptions(address _user)
    //     public
    //     view
    //     returns (Subscription[] memory)
    // {
    //     Subscription[] memory allSubscriptionsArray;

    //     for (uint256 i = 0; i < nextSubPlanID; i++) {
    //         if (subscriptions[_user][i].active) {
    //             allSubscriptionsArray.push(subscriptions[_user][i]);
    //         }
    //     }

    //     return allSubscriptionsArray;
    // }

    function getSubscription(address _user, uint256 _planID)
        public
        view
        returns (Subscription memory)
    {
        return subscriptions[_user][_planID];
    }

    function numberOfTotalPlans() public view returns (uint256) {
        return nextSubPlanID - 1;
    }
}
