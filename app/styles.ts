import { StyleSheet, Platform, Dimensions } from 'react-native';
import { Palette } from 'assets/constants';

export const shortDimension = (() => {
    const dim = Dimensions.get('window');
    return ((dim.height > dim.width ? dim.width : dim.height));
})();

export const h1 = (shortDimension > 320) ? 36 : 30;
export const h2 = (shortDimension > 320) ? 24 : 20;
export const h3 = (shortDimension > 320) ? 16 : 14;

export const inheritedStyles = {
    text: {
        color: "#888"
    },
    highlight: {
        color: "#B5B69C"
    },
    iosPad: {
        paddingTop: (Platform.OS === 'ios' ? 20 : 0)                
    },
    selectTitle: {
        fontSize: h2,
        fontWeight: '700',
        color: "#fff",
        marginTop: 100,
        marginBottom: 10,        
        marginLeft: 15        
    },
    BottomDrawer: {
        position: 'absolute',
        top: 0,
        height: '100%',
        width: '100%',
    },
    FormItem: {
        color: "#FFF",
        paddingTop: 10,
        paddingBottom: 10,
        paddingRight: 15, 
        borderColor: "#222",
        borderBottomWidth: (Platform.OS === 'ios') ? StyleSheet.hairlineWidth : 0,
        fontSize: h3
    },
    FormItemDisabled: {
        color: '#888'
    },
    ListItemText: {
        color: "#FFF",
        fontSize: h3
    },
    ListSwitch: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    Navigation: {
        backgroundColor: "#181818",
        borderColor: "#303030",
        borderStyle: "solid"
    },
    NavigationHeaderTitle: {
        color: "#FFF"
    },
    ListItemOuter: {
        backgroundColor: "#171717",             
        paddingLeft: 15,      
        borderColor: "#222",
    },
    ListItemInner: {
        paddingTop: 10,
        paddingRight: 15, 
        paddingBottom: 10,         
        borderColor: "#222",
        borderBottomWidth: StyleSheet.hairlineWidth        
    },
    firstInList: {
        borderTopWidth: StyleSheet.hairlineWidth,                
    },
    lastInList: {
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    innerLastInList: {
        borderBottomWidth: 0
    },
    SelectModalOuter: {
        flex: 1,
        justifyContent: 'flex-end'
    },
    SelectModalInner: {
        backgroundColor: "#181818",
    },
    SelectModalHeader: {
        marginTop: 5,
        marginRight: 10,
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    View: {
        flex: 1,
        backgroundColor: Palette.background
    },
    SubscriptionTerms: {
        color: '#444',
        fontSize: 12,
        margin: 15
    },
    Link: {
        color: 'Palette.link'
    },
    navbarRight: {
        marginRight: (Platform.OS == 'ios') ? 5 : 15
    },
    DrawerHandle: {
        height: 4,
        width: 100,
        backgroundColor: '#888',
        borderRadius: 2,
        alignSelf: 'center',
        zIndex: 3000,
        top: 10
    }
}

const styles = StyleSheet.create(inheritedStyles as any);

export default styles;