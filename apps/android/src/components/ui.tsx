import React from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import {theme} from "../theme/theme";

export function Screen({title,subtitle,children}:{title:string;subtitle?:string;children?:React.ReactNode}) {
  return <View style={s.screen}>
    <Text style={s.title}>{title}</Text>
    {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
    <View style={s.content}>{children}</View>
  </View>;
}
export function Card({title,text,onPress}:{title:string;text:string;onPress?:()=>void}) {
  const body=<View style={s.card}><Text style={s.cardTitle}>{title}</Text><Text style={s.cardText}>{text}</Text></View>;
  return onPress?<Pressable onPress={onPress}>{body}</Pressable>:body;
}
const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:theme.background,padding:20,direction:"rtl"},
 title:{fontSize:28,fontWeight:"800",color:theme.text,textAlign:"right",marginTop:12},
 subtitle:{fontSize:15,color:theme.muted,textAlign:"right",marginTop:6},
 content:{gap:12,marginTop:20},
 card:{backgroundColor:theme.surface,borderRadius:theme.radius,padding:18,borderWidth:1,borderColor:theme.border},
 cardTitle:{fontSize:18,fontWeight:"700",color:theme.text,textAlign:"right"},
 cardText:{fontSize:14,color:theme.muted,textAlign:"right",marginTop:5,lineHeight:21}
});
