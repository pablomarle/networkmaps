let index_data = {
	user_socket: null,
	connected: false,
	session: null,
	state: "",
	current_diagram: {},
	name: "NetGraph"
};

function process_message(message) {
	if(message.m == "I") {
		if(message.d.user) {
			index_data.session = message.d;
		}

		set_state("P");
	}
	else if(message.m == "L") {
		if(message.d.error) {
			DOM.showError("Invalid Parameters", message.d.error);
		}
		else {
			if (message.d.result) {
				index_data.session = message.d.result;
				screen_init_logged();
			}
			else {
				DOM.showError("Login failed", "Please, check your username and password.")
			}
		}
	}
	else if(message.m == "O") {
		index_data.session = null;
		screen_init_notlogged();
	}
	else if(message.m == "C") {
		if(message.d.error) {
			DOM.showError("Invalid Parameters", message.d.error);
		}
		else {
			set_state("RD");
		}
	}
	else if(message.m == "R") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("FD");
		}
	}
	else if(message.m == "X") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("APD");
		}
	}
	else if(message.m == "D") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			index_data.session.name = message.d.n;
			index_data.session.lastname = message.d.l;

			set_state("ADD");
		}
	}
	else if(message.m == "DN") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("ND");
		}
	}
	else if(message.m == "DL") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			screen_main_updatelistdiagrams(message.d.dl);
		}
	}
	else if(message.m == "DD") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("P")
		}
	}
	else if(message.m == "DR") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("DR")
		}
	}
	else if(message.m == "DP") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			screen_diagram_config_updateshares(message.d);
		}
	}
	else if(message.m == "DS") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("DSD");
		}
	}
	else if(message.m == "PD") {
		if(message.d.error) {
			DOM.showError("Error", message.d.error);
		}
		else {
			set_state("PD");
		}
	}
}

function setup_usersocket() {
	try {
		index_data.user_socket = new WebSocket(wsconfig + "user");
	}
	catch(err) {
		alert("Websockets are not supported on this browser");
	}
	index_data.user_socket.onopen = function (event) {
		index_data.connected = true;
	}

	index_data.user_socket.onmessage = function(event) {
		let message = JSON.parse(event.data);
		process_message(message);
	}

	index_data.user_socket.onclose = () => {
		index_data.connected = false;
		DOM.showError("Socket Closed", "Connection closed.");
	};

	index_data.user_socket.onerror = () => {
		index_data.connected = false;
		DOM.showError("Socket Error", "There was an error in the connection to the server.");
	};	
}

function send(data) {
	if(!index_data.connected)
		DOM.showError("Socket Closed", "Can't connect to server. Try reloading the page.");;

	index_data.user_socket.send(JSON.stringify(data));
}

function create_diagram() {
	let diagram_name = index_data.diagram_name.value;
	send({
		m: "DN",
		d: {
			n: diagram_name,
		}
	})
}

function get_diagrams() {
	send({
		m: "DL",
		d: {}
	})
}

function delete_diagram() {
	let uuid = this.getAttribute("data-uuid");
	send({
		m: "DD",
		d: {
			uuid: uuid
		}
	})
}

function rename_diagram() {
	let uuid = this.getAttribute("data-uuid");
	send({
		m: "DR",
		d: {
			uuid: uuid,
			n: index_data.diagram_name.value
		}
	})
}

function get_permissions(uuid) {
	send({
		m: "DP",
		d: {uuid: uuid}
	})	
}

function delete_permission() {
	let id = this.getAttribute("data-id");
	send({
		m: "PD",
		d: {
			id: id
		}
	})
}

function share() {
	let uuid = this.getAttribute("data-uuid");
	let email = index_data.share_email.value;
	let permission = index_data.share_permission.value;
	send({
		m: "DS",
		d: {uuid: uuid, e:email, p:permission}
	})	
	
}

function login() {
	let username = index_data.login_user.value;
	let password = index_data.login_password.value;
	index_data.login_password.value = "";

	send({
		m: "L",
		d: {
			username: username,
			password: password
		}
	})
}

function register() {
	let email = index_data.register_email.value;
	let name = index_data.register_name.value;
	let lastname = index_data.register_lastname.value;
	send({
		m: "C",
		d: {
			email: email,
			name: name,
			lastname: lastname,
		}
	})
}

function reset_pwd() {
	let email = index_data.reset_email.value;
	send({
		m: "R",
		d: {
			email: email,
		}
	})
}

function logout() {
	send({
		m: "O",
		d: {}
	})
}

function change_password() {
	let oldpwd = index_data.oldpwd.value;
	let newpwd = index_data.newpwd.value;
	let newpwd2 = index_data.newpwd2.value;
	if(newpwd !== newpwd2) {
		DOM.showError("Error", "New passwords don't match.");
		return;
	}
	
	send({
		m: "X",
		d: {
			e: index_data.session.user,
			o: oldpwd,
			n: newpwd,
		}
	});
}

function account_change() {
	let name = index_data.account_name.value;
	let lastname = index_data.account_lastname.value;

	send({
		m: "D",
		d: {
			n: name,
			l: lastname,
		}
	});
}

function add_message_box(title) {
	let body = document. getElementsByTagName("body")[0];

	if(index_data.messagebox)
		delete_message_box();
	
	index_data.messagebox = DOM.cdiv_fade(body, null, "box");
		DOM.cdiv(index_data.messagebox, null, "boxtitle", title);

	return index_data.messagebox;
}

function delete_message_box() {
	if(index_data.messagebox) {
		DOM.fadeOutElement(index_data.messagebox);
	}

	index_data.messagebox = null;
}

function add_infobox(text, px, py) {
	let ib = document.getElementById("infobox");
	if(!ib) {
		let body = document. getElementsByTagName("body")[0];
		ib = DOM.cdiv(body, "infobox", "infobox", text);
		ib.style.position = "fixed";
		ib.style.top = py + "px";
		ib.style.left = px + "px";
	}
	else {
		DOM.removeChilds(ib, true);
		ib.innerHTML = text;
	}
}

function remove_infobox() {
	let ib = document.getElementById("infobox");
	if(ib)
		DOM.removeElement(ib);
}

function set_node_infobox(node, text) {
	node.addEventListener("mouseover", (ev) => {
		add_infobox(text, ev.pageX+10, ev.pageY-10)
	})
	node.addEventListener("mouseout", () => {
		remove_infobox();
	})
}
function screen_initialize() {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];
}

function screen_init_notlogged() {
	let body = document. getElementsByTagName("body")[0];
	DOM.removeChilds(body);

	setTimeout(() => {
		index_data.head = DOM.cdiv_fade(body, null, "head");
			div = DOM.cdiv(index_data.head, null, "headleft");
				DOM.cdiv(div, null, "headtext", index_data.name);
			div = DOM.cdiv(index_data.head, null, "headright");
				DOM.cbutton(div, null, "button headbutton", "About Us", null, () => { set_state("AU"); });
				DOM.cbutton(div, null, "button headbutton", "Login", null, () => { set_state("L") });
				DOM.cbutton(div, null, "button headbutton", "Register", null, () => { set_state("R") });

		index_data.content = DOM.cdiv_fade(body, null, "content");

		set_state("P");
	}, 500);
}

function screen_present(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];
	if(old_state == "I")
		screen_init_notlogged();

	delete_message_box();

}

function screen_about_us() {
    let div, body, t, tr, td, i, form;
    body = document.getElementsByTagName("body")[0];
    
    div = add_message_box("About Us");
    DOM.cdiv(div, null, "aboutus", "Developed by Pablo Martin Leon (2018-2019)."); 
}

function screen_login(old_state) {
	let div, body, t, tr, td, i, form;
	body = document.getElementsByTagName("body")[0];

	div = add_message_box("Login");
	t = DOM.ctable(div, null, "t_center");
		tr = DOM.ctr(t);
			td = DOM.ctd(tr, null, null, "Username");
			td = DOM.ctd(tr);
				index_data.login_user = DOM.ci_text(td, null, "input");
				index_data.login_user.style.width = "230px";

		tr = DOM.ctr(t);
			td = DOM.ctd(tr, null, null, "Password");
			td = DOM.ctd(tr);
				index_data.login_password = DOM.ci_pwd(td, null, "input");
				index_data.login_password.style.width = "230px";
	
		tr = DOM.ctr(t);
			td = DOM.ctd(tr);
				DOM.cbutton(td, null, "button", "Login", null, login);
				DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("P") });
				DOM.cbutton(td, null, "button", "Forgot Password", null, () => { set_state("F") });
			td.colSpan = "2";
}

function screen_register(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];
	
	div = add_message_box("Create User Account")
		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Name");
				td = DOM.ctd(tr);
				index_data.register_name = DOM.ci_text(td, null, "input");
				index_data.register_name.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Last Name");
				td = DOM.ctd(tr);
				index_data.register_lastname = DOM.ci_text(td, null, "input");
				index_data.register_lastname.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "E-Mail");
				td = DOM.ctd(tr);
				index_data.register_email = DOM.ci_text(td, null, "input");
				index_data.register_email.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Register", null, register);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("P") });
				td.colSpan = "2";
}

function screen_register_done(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Registration Finished")
		DOM.cdiv(div, null, "paragraph", "You should receive and email with an activation code. Please, follow it to have your account activated.");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("P")});
}

function screen_pwd_reset(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Forgot Password")
		DOM.cdiv(div, null, "paragraph", "Enter your email address to reset your password.")
		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "E-Mail");
				td = DOM.ctd(tr);
				index_data.reset_email = DOM.ci_text(td, null, "input");
				index_data.reset_email.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Reset Password", null, reset_pwd);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("L") });
				td.colSpan = "2";
}

function screen_pwd_reset_done(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Password Reset")
		DOM.cdiv(div, null, "paragraph", "You should receive and email with an activation code. Please, follow it to change your password.");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("L")});
}

function screen_unknown(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Unknown State")
		DOM.cdiv(div, null, "paragraph", "The action you took was unexpected.");
		DOM.cdiv(div, null, "paragraph", "If the problem persists, contact your administrator.");
		t = DOM.cdiv(div, null, "t_center");
			DOM.cbutton(t, null, "button", "Return", null, () => { set_state("P") })
}

function screen_init_logged() {
	let div, body, t, tr, td, i, form;

	body = document.getElementsByTagName("body")[0];
	DOM.removeChilds(body);

	setTimeout(() => {
		index_data.head = DOM.cdiv_fade(body, null, "head");
			div = DOM.cdiv(index_data.head, null, "headleft");
				DOM.cdiv(div, null, "headtext", index_data.name);
			div = DOM.cdiv(index_data.head, null, "headright");
			i = DOM.cbutton(div, null, "button", "Account", null, () => {set_state("A")});
			i = DOM.donate(div);
		index_data.content = DOM.cdiv_fade(body, null, "content");
			div = DOM.cdiv(index_data.content, null, "newdiagram");
				i = DOM.cimg(div, staticurl + "/static/img/newdiagram.png", "newdiagram", "iconbutton button", null, () => {set_state("N")});
				set_node_infobox(i, "Create New Diagram");
				DOM.cdiv(div, null, "iconbuttontext", "New Diagram");

			index_data.listdiagrams = DOM.cdiv(index_data.content, null, "diagramlist");

		set_state("P");
	}, 500);
}

function screen_main(old_state) {
	let div, body, t, tr, td, i, form;
	body = document.getElementsByTagName("body")[0];
	if(old_state == "I" || old_state == "DC") {
		screen_init_logged();
		return;
	}

	delete_message_box();

	get_diagrams();
}

function screen_main_updatelistdiagrams(list_diagrams) {
	let div, t, tr, td, i, form;

	DOM.removeChilds(index_data.listdiagrams, true);

	for(let x = 0; x < list_diagrams.length; x++) {
		div = DOM.cdiv(index_data.listdiagrams, null, "diagram");
			i = DOM.cdiv(div, null, "diagram_name", DOM.esc(list_diagrams[x].name));
			if(list_diagrams[x].permission != "OWNER")
				set_node_infobox(i, "OWNER: " + DOM.esc(list_diagrams[x].on) + " " + DOM.esc(list_diagrams[x].ol) + " (" + DOM.esc(list_diagrams[x].oe) + ")");
			i.addEventListener("click", (e) => {
				window.location.href = "/diagram/" + e.currentTarget.getAttribute("data-uuid");
			})

			i.setAttribute("data-uuid", list_diagrams[x].uuid);

			t = DOM.cdiv(div, null, "diagram_actions");
				
				if(list_diagrams[x].permission == "OWNER") {
					i = DOM.cdiv(t, null, "diagram_button");
					set_node_infobox(i, "Delete Diagram");
						DOM.cimg(i, staticurl + "/static/img/delete.png", null, "diagram_button_img");					
					i.addEventListener("click", (e) => {
						index_data.current_diagram.uuid = e.currentTarget.getAttribute("data-uuid");
						set_state("DD")
					});
					i.setAttribute("data-uuid", list_diagrams[x].uuid);
				
					i = DOM.cdiv(t, null, "diagram_button");
					set_node_infobox(i, "Diagram Settings");
						DOM.cimg(i, staticurl + "/static/img/settings.png", null, "diagram_button_img");
					i.addEventListener("click", (e) => {
						index_data.current_diagram.uuid = e.currentTarget.getAttribute("data-uuid");
						index_data.current_diagram.name = e.currentTarget.getAttribute("data-name");
						set_state("DC");
					});
					i.setAttribute("data-uuid", list_diagrams[x].uuid);
					i.setAttribute("data-name", list_diagrams[x].name);

					i = DOM.cdiv(t, null, "diagram_button");
					set_node_infobox(i, "Share Diagram");
						DOM.cimg(i, staticurl + "/static/img/share.png", null, "diagram_button_img");
					i.addEventListener("click", (e) => { 
						index_data.current_diagram.uuid = e.currentTarget.getAttribute("data-uuid");
						set_state("DS")
					});
					i.setAttribute("data-uuid", list_diagrams[x].uuid);
				}
	}
}

function screen_account(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box(index_data.session.name + " " + index_data.session.lastname);
		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Change Details", null, () => {set_state("AD")})
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Change Password", null, () => {set_state("AP")})
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Logout", null, logout);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Return", null, () => { set_state("P") });
}

function screen_account_password(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Change Password")

		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Old Password");
				td = DOM.ctd(tr);
				index_data.oldpwd = DOM.ci_pwd(td, null, "input");
				index_data.oldpwd.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "New Password");
				td = DOM.ctd(tr);
				index_data.newpwd = DOM.ci_pwd(td, null, "input");
				index_data.newpwd.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Repeat Password");
				td = DOM.ctd(tr);
				index_data.newpwd2 = DOM.ci_pwd(td, null, "input");
				index_data.newpwd2.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Change", null, change_password);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("A") });
				td.colSpan = "2";
}

function screen_account_password_done(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Password Changed")
		DOM.cdiv(div, null, "paragraph", "Your password has been changed successfully.");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("A")});
}

function screen_account_details(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];
	
	div = add_message_box("Change my Account")
		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Name");
				td = DOM.ctd(tr);
				index_data.account_name = DOM.ci_text(td, null, "input");
				index_data.account_name.style.width = "230px";
				index_data.account_name.value = index_data.session.name;
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Last Name");
				td = DOM.ctd(tr);
				index_data.account_lastname = DOM.ci_text(td, null, "input");
				index_data.account_lastname.style.width = "230px";
				index_data.account_lastname.value = index_data.session.lastname;
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Change", null, account_change);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("A") });
				td.colSpan = "2";
}

function screen_account_details_done(old_state) {
	let div, body, t, tr, td, i, form;
	body = document. getElementsByTagName("body")[0];

	div = add_message_box("Account Chnaged")
		DOM.cdiv(div, null, "paragraph", "Your details have been saved successfully.");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("A")});
}

function screen_new_diagram(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("New Diagram")

		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "Name");
				td = DOM.ctd(tr);
				index_data.diagram_name = DOM.ci_text(td, null, "input");
				index_data.diagram_name.style.width = "230px";
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Create", null, create_diagram);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("P") });
				td.colSpan = "2";
}

function screen_new_diagram_done(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("New Diagram Created")
		DOM.cdiv(div, null, "paragraph", "New diagram created successfully");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("P")});
}

function screen_diagram_delete(old_state) {
	let div, body, t, tr, td, i, form;
	let uuid = index_data.current_diagram.uuid;
	
	div = add_message_box("Delete Diagram")
		DOM.cdiv(div, null, "paragraph", "Are you sure you want to delete this diagram?")
		DOM.cdiv(div, null, "paragraph", "This action can't be undone")
		t = DOM.cdiv(div, null, "t_center");
			i = DOM.cbutton(t, null, "button", "Yes", null, delete_diagram);
			i.setAttribute("data-uuid", uuid);
			DOM.cbutton(t, null, "button", "No", null, () => { set_state("P") });
}

function screen_diagram_delete_done(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("Diagram Deleted")
		DOM.cdiv(div, null, "paragraph", "Diagram deleted!!!");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("P")});
}

function screen_diagram_config_init() {
	let div, body, t, tr, td, i, form;

	body = document.getElementsByTagName("body")[0];
	DOM.removeChilds(body);

	setTimeout(() => {
		let uuid = index_data.current_diagram.uuid;
		let name = index_data.current_diagram.name;

		index_data.head = DOM.cdiv_fade(body, null, "head");
			div = DOM.cdiv(index_data.head, null, "headleft");
				DOM.cdiv(div, null, "headtext", index_data.name);
			div = DOM.cdiv(index_data.head, null, "headright");

		index_data.content = DOM.cdiv_fade(body, null, "content");
			div = DOM.cdiv(index_data.content, null, "t_center");
				t = DOM.ctable(div, null, "t_center");
					tr = DOM.ctr(t);
						td = DOM.ctd(tr);
							index_data.diagram_name = DOM.ci_text(td, null, "input");
							index_data.diagram_name.style.width = "230px";
							index_data.diagram_name.value = name;
						td = DOM.ctd(tr);
							i = DOM.cbutton(td, null, "button", "Rename", {uuid:uuid}, rename_diagram);
				DOM.cdiv(index_data.content, null, "t_center", "Shared list.");

			index_data.diagram_shares = DOM.cdiv(index_data.content, null, "diagramlist");


			div = DOM.cdiv(index_data.content, null, "t_center");
				DOM.cbutton(div, null, "button", "Return", null, () => { set_state("P") });

		get_permissions(uuid);
	}, 500);
}

function screen_diagram_config(old_state) {
	let div, body, t, tr, td, i, form;

	if (old_state == "P")
		screen_diagram_config_init();
	else
		get_permissions(index_data.current_diagram.uuid);
	
	delete_message_box();
}

function screen_diagram_config_updateshares(sharelist) {
	let div, body, t, tr, td, i, form;

	DOM.removeChilds(index_data.diagram_shares, true);

	for(let x = 0; x < sharelist.p.length; x++) {
		let share = sharelist.p[x];
		div = DOM.cdiv(index_data.diagram_shares, null, "diagram");
		DOM.cdiv(div, null, "diagram_name", DOM.esc(share.n) + " " + DOM.esc(share.l) + " (" + DOM.esc(share.email) + ") has " + 
			(share.p == "RW" ? "Read Write" : (share.p == "RO" ? "Read Only" : share.p)) + " access." );
		t = DOM.cdiv(div, null, "diagram_actions");
		i = DOM.cdiv(div, null, "diagram_button");
		set_node_infobox(i, "Remove Permission");
		i.setAttribute("data-id", share.pid);
		i.addEventListener("click", delete_permission);
			DOM.cimg(i, staticurl + "/static/img/delete.png", null, "diagram_button_img");

	}
}

function screen_diagram_share(old_state) {
	let div, body, t, tr, td, i, form;
	let uuid = index_data.current_diagram.uuid;

	body = document. getElementsByTagName("body")[0];
	
	div = add_message_box("Share Diagram")
		DOM.cdiv(div, null, "paragraph", "Enter the email of the person you want this diagram to be shared with.")
		t = DOM.ctable(div, null, "t_center");
			tr = DOM.ctr(t);
				td = DOM.ctd(tr, null, null, "E-Mail");
				td = DOM.ctd(tr);
					index_data.share_email = DOM.ci_text(td, null, "input");
					index_data.share_email.style.width = "230px";
				td = DOM.ctd(tr);
					index_data.share_permission = DOM.cselect(td, null, "input", [["Read Write", "RW"],["Read Only", "RO"]]);
			tr = DOM.ctr(t);
				td = DOM.ctd(tr);
					DOM.cbutton(td, null, "button", "Share", {"uuid": uuid}, share);
					DOM.cbutton(td, null, "button", "Cancel", null, () => { set_state("P") });
				td.colSpan = "3";
}

function screen_diagram_share_done(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("Diagram Shared")
		DOM.cdiv(div, null, "paragraph", "Diagram shared with user!!!");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("P")});
}

function screen_diagram_renamed(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("Diagram Renamed")
		DOM.cdiv(div, null, "paragraph", "Diagram has been renamed");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("DC")});
}

function screen_diagram_permission_deleted(old_state) {
	let div, body, t, tr, td, i, form;

	div = add_message_box("Permission Removed")
		DOM.cdiv(div, null, "paragraph", "Diagram permission has been removed");
		t = DOM.cdiv(div, null, "t_center");
		DOM.cbutton(t, null, "button", "Return", null, () => {set_state("DC")});
}

function set_state(new_state, data) {
	let old_state = index_data.state;
	index_data.state = new_state;


	if(new_state == "I") {
		screen_initialize();
		return;
	}
	else if(new_state == "P") { // Present initial screen
		if(index_data.session)
			screen_main(old_state);
		else
			screen_present(old_state);
	}
    else if(new_state == "AU") { // About Us
        screen_about_us();
    }
	else if(new_state == "L") { // Log in
		screen_login(old_state);
	}
	else if(new_state == "R") { // Register window
		screen_register(old_state);
	}
	else if(new_state == "RD") { // Register done
		screen_register_done(old_state)
	}
	else if(new_state == "A") { // Account window
		screen_account(old_state);
	}
	else if(new_state == "F") { // Password reset
		screen_pwd_reset(old_state);
	}
	else if(new_state == "FD") { // Password reset is done
		screen_pwd_reset_done(old_state);
	}
	else if(new_state == "AD") { // Account details
		screen_account_details(old_state);
	}
	else if(new_state == "ADD") { // Account details done
		screen_account_details_done(old_state);
	}
	else if(new_state == "AP") { // Account password
		screen_account_password(old_state);
	}
	else if(new_state == "APD") { // Account password done
		screen_account_password_done(old_state);
	}
	else if(new_state == "N") { // New diagram
		screen_new_diagram(old_state);
	}
	else if(new_state == "ND") { // New diagram
		screen_new_diagram_done(old_state);
	}
	else if(new_state == "DS") { // Share diagram
		screen_diagram_share(old_state);
	}
	else if(new_state == "DSD") { // Share diagram Done
		screen_diagram_share_done(old_state);
	}
	else if(new_state == "DC") { // Config diagram
		screen_diagram_config(old_state);
	}
	else if(new_state == "DD") { // Delete diagram
		screen_diagram_delete(old_state);
	}
	else if(new_state == "PD") { // Permission has been deleted
		screen_diagram_permission_deleted(old_state);
	}
	else if(new_state == "DR") { // Diagram Renamed
		screen_diagram_renamed(old_state);
	}
	else if(new_state == "DDD") { // Delete diagram done
		screen_diagram_delete_done(old_state);
	}
	else {
		screen_unknown(old_state);
	}
}

function main() {
	setup_usersocket();
	set_state("I");
}
