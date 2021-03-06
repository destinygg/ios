import Chat from '../../lib/assets/chat/js/chat';
import MobileWindow from './components/window';
import {MobileMessageBuilder as MessageBuilder} from './messages'
import {AsyncStorage} from 'react-native';

const settingsdefault = new Map([
    ['schemaversion', 1],
    ['showtime', false],
    ['hideflairicons', false],
    ['profilesettings', false],
    ['timestampformat', 'HH:mm'],
    ['maxlines', 250],
    ['notificationwhisper', false],
    ['notificationhighlight', false],
    ['highlight', true], // todo rename this to `highlightself` or something
    ['customhighlight', []],
    ['highlightnicks', []],
    ['taggednicks', []],
    ['showremoved', false],
    ['showhispersinchat', false],
    ['ignorenicks', []],
    ['focusmentioned', false],
    ['notificationtimeout', true],
    ['ignorementions', false],
    ['autocompletehelper', false],
    ['taggedvisibility', false]
])

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/* Subclass reimplementing all methods using jQuery. */
export class MobileChat extends Chat {
    static current;
    constructor() {
        super();
        this.mainwindow = new MobileWindow('main').into(this);
        this.mobilePmWindow = null;
        this.me = null;
        this.mobileSettings = null;

        MobileChat.current = this;
    }

    withMe(me) {
        this.me = me;
        return this;
    }

    loadMobileSettings() {
        if (this.mobileSettings === null) {
            return new Promise(resolve => {
                AsyncStorage.getItem('appSettings', (err, settings) => {
                    let settingsObj;
                    if (err) {
                        settingsObj = this.initMobileSettings();
                    } else {
                        settingsObj = JSON.parse(settings);                    
                        if (settingsObj !== null) {
                            console.log("loaded mobile settings: " + settings);
                        } else {
                            settingsObj = this.initMobileSettings();
                        }
                    }
                    this.mobileSettings = settingsObj;
                    resolve();
                });
            })
        } else {
            return Promise.resolve();
        }
    }

    withHistory(history) {
        if(history && history.length > 0) {
            this.backlogloading = true;
            history.forEach(line => this.source.parseAndDispatch({data: line}));
            this.backlogloading = false;
            this.mainwindow.updateAndPin();
        }
        return this;
    }

    saveMobileSettings() {
        AsyncStorage.setItem('appSettings', JSON.stringify(this.mobileSettings));
    }

    setMobileSetting(name, value) {
        this.mobileSettings[name] = value;
    }

    initMobileSettings() {
        const settings = {
            mediaModal: true,
            chatTimestamp: true,
            emoteDirLoseFocus: false,
            menuDrawerButton: false
        };
        AsyncStorage.setItem('appSettings', JSON.stringify(settings));
        console.log("reset mobile settings: " + JSON.stringify(settings));
        return settings;
    }

    send(text) {
        this.control.emit('SEND', text.trim());
    }

    censor(nick) {
        this.mainwindow.censor(nick);
    }

    onCLOSE() {
        const wasconnected = this.connected;
        this.connected = false;
        if (this.reconnect) {
            const rand = ((wasconnected) ? Math.floor(Math.random() * (3000 - 501 + 1)) + 501 : Math.floor(Math.random() * (30000 - 5000 + 1)) + 5000);
            setTimeout(() => {
                if (!this.connected) this.connect(this.uri)
            }, rand);
            //MessageBuilder.status(`Disconnected... reconnecting in ${Math.round(rand / 1000)} seconds`).into(this);
        }
    }

    onNAMES(data){
        this.mainwindow.ui && this.mainwindow.ui.onConnected();
    }

    saveSettings() {

    }

    withSettings(settings){
        // If authed and #settings.profilesettings=true use #settings
        // Else use whats in LocalStorage#chat.settings
        let stored = this.authenticated && settings.get('profilesettings') ? settings : new Map([]);
        // Loop through settings and apply any settings found in the #stored data
        if(stored.size > 0) {
            [...this.settings.keys()]
                .filter(k => stored.get(k) !== undefined && stored.get(k) !== null)
                .forEach(k => this.settings.set(k, stored.get(k)));
        }
        // Upgrade if schema is out of date
        const oldversion = parseInt(stored.get('schemaversion') || -1);
        const newversion = settingsdefault.get('schemaversion');

        this.taggednicks = new Map(this.settings.get('taggednicks'));
        this.ignoring = new Set(this.settings.get('ignorenicks'));
        return this;
    }

    applySettings(save = true) {
        if (save) this.saveSettings();

        // Ignore Regex
        const ignores = Array.from(this.ignoring.values()).map(Chat.makeSafeForRegex);
        this.ignoreregex = ignores.length > 0 ? new RegExp(`\\b(?:${ignores.join('|')})\\b`, 'i') : null;

        // Highlight Regex
        const cust = [...(this.settings.get('customhighlight') || [])].filter(a => a !== '');
        const nicks = [...(this.settings.get('highlightnicks') || [])].filter(a => a !== '');
        this.regexhighlightself = this.user.nick ? new RegExp(`\\b(?:${this.user.nick})\\b`, 'i') : null;
        this.regexhighlightcustom = cust.length > 0 ? new RegExp(`\\b(?:${cust.join('|')})\\b`, 'i') : null;
        this.regexhighlightnicks = nicks.length > 0 ? new RegExp(`\\b(?:${nicks.join('|')})\\b`, 'i') : null;

        // Update maxlines
        [...this.windows].forEach(w => w.maxlines = this.settings.get('maxlines'));
    }

    onPRIVMSG(data) {
        const normalized = data.nick.toLowerCase()
        if (!this.ignored(normalized, data.data)) {
            if (!this.whispers.has(normalized))
                this.whispers.set(normalized, { nick: data.nick, unread: 0, open: false })
            
                const conv = this.whispers.get(normalized),
                user = this.users.get(normalized) || new ChatUser(data.nick),
                messageid = data.hasOwnProperty('messageid') ? data['messageid'] : null

                if (this.mobilePmWindow !== null && 
                        this.mobilePmWindow.user.toLowerCase() === normalized) {
                    this.mobilePmWindow.addTheirMessage(data.data);
                }

                if (this.settings.get('showhispersinchat'))
                    MessageBuilder.whisper(data.data, user, this.user.username, data.timestamp, messageid).into(this)
        }
    }

    onMSG(data){
        let textonly = Chat.extractTextOnly(data.data);
        const isemote = this.emoticons.has(textonly) || this.twitchemotes.has(textonly);
        const win = this.mainwindow;
        if(isemote && win.lastmessage !== null && Chat.extractTextOnly(win.lastmessage.message) === textonly){
            if(win.lastmessage.type === MessageTypes.EMOTE) {
                this.mainwindow.lock();
                win.lastmessage.incEmoteCount();
                this.mainwindow.unlock();
            } else {
                win.lines.pop();
                MessageBuilder.emote(textonly, data.timestamp, 2).into(this);
            }
        } else if(!this.resolveMessage(data.nick, data.data)){
            MessageBuilder.message(data.data, this.users.get(data.nick.toLowerCase()), data.timestamp).into(this);
        }
    }

    removeMessageByNick(nick) {
        this.mainwindow.removelines(nick.toLowerCase);
    }

    cmdSTALK(parts) {
        if (parts[0] && /^\d+$/.test(parts[0])) {
            parts[1] = parts[0];
            parts[0] = this.user.username;
        }
        if (!parts[0] || !nickregex.test(parts[0].toLowerCase())) {
            MessageBuilder.error('Invalid nick - /stalk <nick> <limit>').into(this);
            return;
        }
        if (this.busystalk) {
            MessageBuilder.error('Still busy stalking').into(this);
            return;
        }
        if (this.nextallowedstalk && this.nextallowedstalk.isAfter(new Date())) {
            MessageBuilder.error(`Next allowed stalk ${this.nextallowedstalk.fromNow()}`).into(this);
            return;
        }
        this.busystalk = true;
        const limit = parts[1] ? parseInt(parts[1]) : 3;
        MessageBuilder.info(`Getting messages for ${[parts[0]]} ...`).into(this);
        fetch(`/api/chat/stalk?username=${encodeURIComponent(parts[0])}&limit=${limit}`)
            .then(r => {
                this.nextallowedstalk = moment().add(10, 'seconds');
                this.busystalk = false;
                if (r.status !== 200) {
                    MessageBuilder.error(`No messages for ${parts[0] } received. Try again later`).into(this);
                    return;
                }

                let d = r.text();
                if (!d || !d.lines || d.lines.length === 0) {
                    MessageBuilder.info(`No messages for ${parts[0]}`).into(this);
                } else {
                    const date = moment.utc(d.lines[d.lines.length - 1]['timestamp'] * 1000).local().format(DATE_FORMATS.FULL);
                    MessageBuilder.info(`Stalked ${parts[0]} last seen ${date}`).into(this);
                    d.lines.forEach(a => MessageBuilder.historical(a.text, new ChatUser(d.nick), a.timestamp * 1000).into(this))
                    MessageBuilder.info(`End of stalk (https://dgg.overrustlelogs.net/${parts[0]})`).into(this);
                }
            })
            .catch(e => {
                this.nextallowedstalk = moment().add(10, 'seconds');
                this.busystalk = false;
                MessageBuilder.error(`Could not complete request.`).into(this)
            });
    }

    cmdTAG(parts) {
        if (parts.length === 0) {
            if (this.taggednicks.size > 0) {
                MessageBuilder.info(`Tagged nicks: ${[...this.taggednicks.keys()].join(',')}. Available colors: ${tagcolors.join(',')}`).into(this);
            } else {
                MessageBuilder.info(`No tagged nicks. Available colors: ${tagcolors.join(',')}`).into(this);
            }
            return;
        }
        if (!nickregex.test(parts[0])) {
            MessageBuilder.error('Invalid nick - /tag <nick> <color>').into(this);
            return;
        }
        const n = parts[0].toLowerCase();
        if (n === this.user.username.toLowerCase()) {
            MessageBuilder.error('Cannot tag yourself').into(this);
            return;
        }
        const color = parts[1] && tagcolors.indexOf(parts[1]) !== -1 ? parts[1] : tagcolors[Math.floor(Math.random() * tagcolors.length)];
        const lines = this.mainwindow.getlines(n);

        for (let i = 0; i < lines.length; i++) {
            lines[i].removeClass(Chat.removeClasses('msg-tagged'))
                    .addClass(`msg-tagged msg-tagged-${color}`);
        }
        this.taggednicks.set(n, color);
        MessageBuilder.info(`Tagged ${this.user.username} as ${color}`).into(this);

        this.settings.set('taggednicks', [...this.taggednicks]);
        this.applySettings();
    }

    cmdUNTAG(parts) {
        if (parts.length === 0) {
            if (this.taggednicks.size > 0) {
                MessageBuilder.info(`Tagged nicks: ${[...this.taggednicks.keys()].join(',')}. Available colors: ${tagcolors.join(',')}`).into(this);
            } else {
                MessageBuilder.info(`No tagged nicks. Available colors: ${tagcolors.join(',')}`).into(this);
            }
            return;
        }
        if (!nickregex.test(parts[0])) {
            MessageBuilder.error('Invalid nick - /untag <nick> <color>').into(this);
            return;
        }
        const n = parts[0].toLowerCase();
        this.taggednicks.delete(n);
        const lines = this.mainwindow.getlines(n);
        
        for (let i = 0; i < lines.length; i++) {
            lines[i].removeClass(Chat.removeClasses('msg-tagged'));
        }
        MessageBuilder.info(`Un-tagged ${n}`).into(this);
        this.settings.set('taggednicks', [...this.taggednicks]);
        this.applySettings();
    }

    cmdSEND(str) {
        if(str !== ''){
            const win = this.getActiveWindow(),
                 isme = str.substring(0, 4).toLowerCase() === '/me ',
            iscommand = !isme && str.substring(0, 1) === '/' && str.substring(0, 2) !== '//'
            // COMMAND
            if (iscommand) {
                const command = iscommand ? str.split(' ', 1)[0] : '',
                   normalized = command.substring(1).toUpperCase()
                if(win !== this.mainwindow && normalized !== 'EXIT'){
                    MessageBuilder.error(`No commands in private windows. Try /exit`).into(this, win)
                } else if(this.control.listeners.has(normalized)) {
                    const parts = (str.substring(command.length+1) || '').match(/([^ ]+)/g)
                    this.control.emit(normalized, parts || [])
                } else {
                    MessageBuilder.error(`Unknown command. Try /help`).into(this, win)
                }
            }
            // WHISPER
            else if(win !== this.mainwindow) {
                MessageBuilder.message(str, this.user).into(this, win)
                this.source.send('PRIVMSG', {nick: win.name, data: str})
            }
            // MESSAGE
            else {
                const textonly = (isme ? str.substring(4) : str).trim()
                if (this.connected && !this.emoticons.has(textonly) && !this.twitchemotes.has(textonly)){
                    // We add the message to the gui immediately
                    // But we will also get the MSG event, so we need to make sure we dont add the message to the gui again.
                    // We do this by storing the message in the unresolved array
                    // The onMSG then looks in the unresolved array for the message using the nick + message
                    // If found, the message is not added to the gui, its removed from the unresolved array and the message.resolve method is run on the message
                    const message = MessageBuilder.message(str, this.user).into(this)
                    this.unresolved.unshift(message)
                }
                this.source.send('MSG', {data: str})
            }
        }
    }

    cmdMENTIONS(parts) {
        if (parts[0] && /^\d+$/.test(parts[0])) {
            parts[1] = parts[0];
            parts[0] = this.user.username;
        }
        if (!parts[0]) parts[0] = this.user.username;
        if (!parts[0] || !nickregex.test(parts[0].toLowerCase())) {
            MessageBuilder.error('Invalid nick - /mentions <nick> <limit>').into(this);
            return;
        }
        if (this.busymentions) {
            MessageBuilder.error('Still busy getting mentions').into(this);
            return;
        }
        if (this.nextallowedmentions && this.nextallowedmentions.isAfter(new Date())) {
            MessageBuilder.error(`Next allowed mentions ${this.nextallowedmentions.fromNow()}`).into(this);
            return;
        }
        this.busymentions = true;
        const limit = parts[1] ? parseInt(parts[1]) : 3;
        MessageBuilder.info(`Getting mentions for ${[parts[0]]} ...`).into(this);
        fetch(`/api/chat/mentions?username=${encodeURIComponent(parts[0])}&limit=${limit}`)
            .then(r => {
                if (r.status !== 200) {
                    MessageBuilder.error(`No messages for ${parts[0]} received. Try again later`).into(this);
                    return;
                }

                let d = r.text();
                this.nextallowedmentions = moment().add(10, 'seconds');
                this.busymentions = false;
                if (!d || d.length === 0) {
                    MessageBuilder.info(`No mentions for ${parts[0]}`).into(this);
                } else {
                    const date = moment.utc(d[d.length - 1].date * 1000).local().format(DATE_FORMATS.FULL);
                    MessageBuilder.info(`Mentions for ${parts[0]} last seen ${date}`).into(this);
                    d.forEach(a => MessageBuilder.historical(a.text, new ChatUser(a.nick), a.date * 1000).into(this))
                    MessageBuilder.info(`End of stalk (https://dgg.overrustlelogs.net/mentions/${parts[0]})`).into(this);
                }
            })
            .catch(e => {
                this.nextallowedmentions = moment().add(10, 'seconds');
                this.busymentions = false;
                MessageBuilder.error(`No mentions for ${parts[0]} received. Try again later`).into(this)
            });
    }

    cmdBANINFO() {
        MessageBuilder.info('Loading ban info ...').into(this);
        fetch(`/api/chat/me/ban`)
            .then(r => {
                if (r.status !== 200) {
                    MessageBuilder.error('Error loading ban info.').into(this);
                    return;
                }

                let d = r.text();
                if (d === 'bannotfound') {
                    MessageBuilder.info(`You have no active bans. Thank you.`).into(this);
                    return;
                }
                const b = $.extend({}, banstruct, d);
                const by = b.username ? b.username : 'Chat';
                const start = moment(b.starttimestamp).format(DATE_FORMATS.FULL);
                if (!b.endtimestamp) {
                    MessageBuilder.info(`Permanent ban by ${by} starting ${start}.`).into(this);
                } else {
                    const end = moment(b.endtimestamp).calendar();
                    MessageBuilder.info(`Temporary ban by ${by} starting ${start} and ending ${end}`).into(this);
                }
                if (b.reason) {
                    const m = MessageBuilder.message(b.reason, new ChatUser(by), b.starttimestamp)
                    m.historical = true
                    m.into(this)
                }
                MessageBuilder.info(`End of ban information`).into(this);
            })
    }
    redrawWindowIndicators() {}
}