const { test, expect } = require('@playwright/test');

test('remote editing messages stay within a session and reconnect', async ({ page }) => {
  await page.goto('/');
  await page.addScriptTag({ url: '/socket.io/socket.io.js' });
  const result = await page.evaluate(async () => {
    const connect = id => new Promise(resolve => {
      const socket = io({ forceNew: true });
      socket.on('connect', () => { socket.emit('comm_wrapper', id, false, () => resolve(socket)); });
    });
    const sender = await connect('test-session');
    const receiver = await connect('test-session');
    const outsider = await connect('another-session');
    const received = [];
    outsider.on('message', message => received.push(message));
    const nextMessage = () => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No message received')), 3000);
      receiver.once('message', message => { clearTimeout(timeout); resolve(message); });
    });
    let pending = nextMessage();
    sender.emit('message', { client_id: 'test-session', type: 'first' });
    const first = await pending;
    receiver.disconnect();
    const reconnected = new Promise(resolve => receiver.once('connect', resolve));
    receiver.connect();
    await reconnected;
    // Ping acknowledgement ensures the earlier room registration was processed.
    await new Promise(resolve => receiver.emit('comm_wrapper', 'test-session', false, resolve));
    pending = nextMessage();
    sender.emit('message', { client_id: 'test-session', type: 'second' });
    const second = await pending;
    sender.disconnect(); receiver.disconnect(); outsider.disconnect();
    return { first: first.type, second: second.type, received };
  });
  expect(result).toEqual({ first: 'first', second: 'second', received: [] });
});
