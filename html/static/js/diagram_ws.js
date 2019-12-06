class WS {
	constructor(call_message, call_close) {
		if(diagram_uuid == 'notdefined') {
			call_close();
			return;
		}

		this.connected = false;
		this.call_message = call_message;
		this.call_close = call_close;

		this.socket = new WebSocket(wsconfig + "diagram/" + diagram_uuid);
		
		this.socket.onopen = this.open_event;

		this.socket.onmessage = this.message_event;

		this.socket.onclose = this.close_event;

		this.socket.onerror = this.close_event;
		this.socket.obj = this;
	}

	open_event() {
		this.obj.connected = true;
	}

	close_event() {
		this.obj.connected = false;
		if(this.obj.call_close)
			this.obj.call_close();
	}

	message_event(event) {
		let message = JSON.parse(event.data);
		this.obj.call_message(message);
	}

	send(data) {
		if(!this.connected)
			return false;

		this.socket.send(JSON.stringify(data));
		return true;
	}

	clear_close_event() {
		this.call_close = null;
	}
}