import React, { Component } from 'react';
import { StatusBar, View } from 'react-native';
import InitNav from './navigation';
const { MobileChat } = require('./chat/chat');
import { NavigationState } from 'react-navigation';

class App extends Component<{}, {navState?: string}> {
    chat: any
    constructor(props: any) {
        super(props);
        if (!this.chat) {
            this.chat = new MobileChat();
        }
        this.state = {};
    }
    render() {
        return (
            <View style={{flex: 1}}>
                <StatusBar barStyle='light-content' />
                <InitNav 
                    onNavigationStateChange={(prevState: NavigationState, currentState: NavigationState) => {
                        const currentScreen = currentState.routes[currentState.index].routeName;
                        const prevScreen = prevState.routes[prevState.index].routeName;
                        if (prevScreen !== currentScreen) {
                            this.setState({navState: currentScreen})
                        }
                    }}
                    screenProps={{ init: true, navState: this.state.navState, chat: this.chat }} 
                />                
            </View>
        );
    }
}

export default App;