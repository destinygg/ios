import React, { Component } from 'react';
import { View, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import styles from './styles';
import EventEmitter from '../../lib/assets/chat/js/emitter';

const tagcolors = [
    "green",
    "yellow",
    "orange",
    "red",
    "purple",
    "blue",
    "sky",
    "lime",
    "pink",
    "black"
];

class MobileChatInput extends Component {
    render() {
        return (
            <TextInput
                style={styles.ChatInput}
                placeholder={'Write something...'}
                placeholderTextColor="#888"
                onSubmitEditing={this.props.onSubmit}
            />
        )
    }
}

export class MobileChatView extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            extraData: true
        }
        this.pinned = true;
        this.input = null;
        this.inputElem = null;
        this.lastRender = 0;
    }

    render() {
        return (
            <KeyboardAvoidingView
                behavior='padding'
                style={[styles.View, styles.ChatView]}
            >
                <FlatList
                    data={this.state.messages}
                    style={styles.ChatViewList}
                    extraData={this.state.extraData}
                    renderItem={item => {
                        return item.item;
                    }}
                    ref={(ref) => this.messageList = ref}
                    onScrollBeginDrag={(e) => this.pinned = false}
                    onScrollEndDrag={(e) => this._onScrollEnd(e)}
                    onContentSizeChange={(width, height) => {
                        this.contentHeight = height;
                        this.maybeScroll();
                    }}
                    onLayout={(e) => {
                        this.height = e.nativeEvent.layout.height;
                    }}
                    keyExtractor={(item, index) => index}
                />
                <MobileChatInput 
                    ref={(ref) => this.inputElem = ref}
                    onChangeText={(text) => this.input = text}
                    onSubmit={() => this.send()}
                />
            </KeyboardAvoidingView>
        );
    }

    _onScrollEnd(e) {
        console.log(e.nativeEvent);
        if (this.contentHeight - e.nativeEvent.contentOffset.y - this.height < 30) {
            this.pinned = true;
        } else {
            this.pinned = false;
        }
    }

    isPinned() {
        return this.pinned;
    }

    pin() {
        this.messageList.scrollToEnd();
        this.pinned = true;
    }

    maybeScroll() {
        if (this.pinned) { this.messageList.scrollToEnd(); }
    }

    send() {
        this.props.chat.control.emit('SEND', this.input.trim());
        this.inputElem.clear();
    }

    sync() {
        this.setState({ messages: this.props.chat.mainwindow.lines });
    }
}

export default class MobileWindow extends EventEmitter {
    constructor(name, type = '', label = '') {
        super()
        this.name = name
        this.label = label
        this.maxlines = 0
        this.tag = null
        this.lastmessage = null
        this.chat = null;
        this.locks = 0
        this.visible = true;
        this.lines = [];
    }

    destroy() {
        this.lines = [];
        if (this.ui) {
            this.ui.sync();            
        }
        return this;
    }

    into(chat) {
        const normalized = this.name.toLowerCase()
        this.maxlines = chat.settings.get('maxlines')
        this.tag = chat.taggednicks.get(normalized) || tagcolors[Math.floor(Math.random() * tagcolors.length)]
        chat.addWindow(normalized, this)
        this.chat = chat;
        this.uiElem = <MobileChatView chat={this.chat} ref={(ref) => this.ui = ref} />;   
        return this
    }

    locked() {
        return this.locks > 0;
    }

    lock() {
        this.locks++;
        if (this.locks === 1) {
            if (this.ui) {            
                this.waspinned = this.ui.isPinned();
            }
        }
    }

    unlock() {
        this.locks--;
        if (this.locks === 0) {
            this.updateAndPin(this.waspinned);
        }
    }

    addMessage(chat, message) {
        this.lastmessage = message        
        message.ui = message.html(chat)
        this.lines.push(message.ui);
        if (this.ui) {            
            this.ui.sync();
            message.afterRender(chat);
        }
        this.cleanup()
    }

    getlines(sel) {
        return this.lines.filter((line) => {
            line.props.msg.user === sel;
        });
    }

    removelines(sel) {
        for (let i = 0; i < this.lines.length; i++) {
            if (this.lines[i].props.msg.user === sel) {
                this.lines.splice(i, 1);
            }
        }
        if (this.ui) {            
            this.ui.sync();
        }
    }

    // Rid excess chat lines if the chat is pinned
    // Get the scroll position before adding the new line / removing old lines
    cleanup() {
        if (this.ui && (this.ui.isPinned() || this.waspinned)) {
            if (this.lines.length >= this.maxlines) {
                this.lines = this.lines.slice(0, this.lines.length - this.maxlines);
                this.ui.sync();
            }
        }
    }

    updateAndPin(pin = true) {
        if (this.ui) {            
            if (pin) {this.ui.pin();}
        }
    }

}

export class ChatViewWrapper extends Component {
    static navigationOptions = {
        title: 'Chat',
    };
    render() {
        return (
            <View style={[styles.View, styles.ChatWrapper]}>{this.props.screenProps.chat.mainwindow.uiElem}</View>
        )
    }

    componentDidMount() {
        this.props.screenProps.chat.mainwindow.ui.sync();
    }
}
