import React, { Component } from 'react';
import { View, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import styles from './styles';
import EventEmitter from '../../lib/assets/chat/js/emitter';

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
            extraData: false
        }
        this.isPinned = true;
        this.input = null;
        this.inputElem = null;
    }

    render() {
        return (
            <KeyboardAvoidingView behavior='padding' style={[styles.View, styles.ChatView]}>
                <FlatList
                    data={this.state.messages}
                    style={styles.ChatViewList}
                    extraData={this.state.extraData}
                    renderItem={item => item}
                    ref={(ref) => this.messageList = ref}
                    onScrollBeginDrag={(e) => this.isPinned = false}
                    onMomentumScrollEnd={(e) => this._onScrollEnd(e)}
                    onContentSizeChange={(width, height) => this.contentHeight = height}
                    onLayout={(e) => this.height = e.nativeEvent.layout.height}
                // should use getitemlayout here too for perf
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
        if (this.contentHeight - e.nativeEvent.contentOffset - this.height < 35) {
            this.isPinned = true;
        } else {
            this.isPinned = false;
        }
    }

    isPinned() {
        return this.isPinned;
    }

    pin() {
        this.messageList.scrollToEnd();
        this.isPinned = true;
    }

    send() {
        this.props.window.chat.control.emit('SEND', this.input.trim());
        this.inputElem.clear();
    }

    sync() {
        this.setState({ messages: this.chat.mainwindow.lines });
        if (this.isPinned) { this.messageList.scrollToEnd(); }
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
        this.ui = <MobileChatView window={this}/>; 
        this.lines = [];
    }

    destroy() {
        this.lines = [];
        this.ui.sync();
        return this;
    }

    into(chat) {
        const normalized = this.name.toLowerCase()
        this.maxlines = chat.settings.get('maxlines')
        this.tag = chat.taggednicks.get(normalized) || tagcolors[Math.floor(Math.random() * tagcolors.length)]
        chat.addWindow(normalized, this)
        this.chat = chat;
        return this
    }

    locked() {
        return this.locks > 0;
    }

    lock() {
        this.locks++;
        if (this.locks === 1) {
            this.waspinned = this.ui.isPinned();
        }
    }

    unlock() {
        this.locks--;
        if (this.locks === 0) {
            this.ui.updateAndPin(this.waspinned);
        }
    }

    addMessage(chat, message) {
        message.ui = message.html(chat)
        message.afterRender(chat)
        this.lastmessage = message
        this.lines.push(message.ui);
        this.ui.sync();
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
        this.ui.sync();
    }

    // Rid excess chat lines if the chat is pinned
    // Get the scroll position before adding the new line / removing old lines
    cleanup() {
        if (this.ui.isPinned() || this.waspinned) {
            if (lines.length >= this.maxlines) {
                this.lines.slice(0, lines.length - this.maxlines);
                this.ui.sync();
            }
        }
    }

    updateAndPin(pin = true) {
        if (pin) {this.ui.pin();}
    }

}