# Bitstamp - liquidity demo

Click [here](https://qweuser.github.io/bitstamp-liquidity-demo/) to check the site and play with the numbers yourself!

This is a demo site, unaffiliated with Bitstamp. It serves to demonstrate Bitcoin liquidity on one of the oldest and most trusted crypto exhanges out there.

# Note

The project logic is based on [Bitstamp's WebSocket documentation](https://www.bitstamp.net/websocket/v2/) and [Live full order book example](https://assets.bitstamp.net/static/webapp/examples/diff_order_book_v2.5dabf12d7fe2ab5e69be923d5f1b1cf6e8d3bafb.html).

I found a bug in Bitstamp’s docs example that always closes the WebSocket after 15 responses, preventing live updates of the order book. The bug has been fixed in this app on January 2nd, 2024, but persists in Bitstamp’s example at the time of writing.

This app would benefit from updating the following:
- Update _var_ to _const_ and _let_
- Remove jQuery dependency
- Rewrite parts of code to reflect other modern ES6 coding conventions

