// 운영 중인 웹앱(Vercel)을 WebView 한 장으로 띄우는 Expo 껍데기 앱.
// 화면·기능은 모두 웹(climate/)에서 바뀌므로, 웹을 배포하면 이 앱도 다시 열 때 바로 반영된다.
import { useCallback, useEffect, useRef, useState, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { ActivityIndicator, BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { WebViewProps } from 'react-native-webview/lib/WebView';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

// react-native-webview 14의 공용 타입은 WebView를 ref 없는 함수 컴포넌트로 선언하지만,
// 실제 iOS·Android 구현(WebView.ios/android)은 forwardRef라 goBack·reload·injectJavaScript를 ref로 쓸 수 있다
type WebViewHandle = { goBack: () => void; reload: () => void; injectJavaScript: (script: string) => void };
const WebView = RNWebView as unknown as ForwardRefExoticComponent<WebViewProps & RefAttributes<WebViewHandle>>;

const APP_URL = 'https://eco-practice-phi.vercel.app/climate/#/today';
const APP_HOST = 'eco-practice-phi.vercel.app';
const BG = '#F4FBF7'; // 웹앱 배경색(--c-background)과 맞춰 상태 표시줄 영역이 이어져 보이게
const PRIMARY = '#059669';

// 로그인 뒤 돌아올 앱 주소. 개발 빌드·스토어 빌드는 ecopractice://auth, Expo Go는 exp://<주소>/--/auth
// Supabase 대시보드 > Authentication > URL Configuration > Redirect URLs 에 둘 다 등록해야 한다
const AUTH_REDIRECT = ExpoLinking.createURL('auth');

// 웹(js/auth.js)은 이 값이 있으면 '앱 안'으로 보고, 로그인 주소를 앱에 넘긴다
const INJECT_BEFORE = `window.__ECO_APP_REDIRECT = ${JSON.stringify(AUTH_REDIRECT)}; true;`;

// 앱 주소 밖(기사 원문, 외부 사이트 등)은 휴대폰 기본 브라우저로 연다
function isAppUrl(url: string) {
  if (url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    return new URL(url).host === APP_HOST;
  } catch {
    return false;
  }
}

function Shell() {
  const ref = useRef<WebViewHandle>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);

  // 안드로이드 뒤로 가기: 웹 안에서 먼저 뒤로 가고, 첫 화면이면 앱을 닫는다
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        ref.current?.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const onNav = useCallback((nav: WebViewNavigation) => setCanGoBack(nav.canGoBack), []);

  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    if (isAppUrl(req.url)) return true;
    Linking.openURL(req.url).catch(() => {});
    return false;
  }, []);

  // 웹이 카카오·구글 로그인 주소를 보내면 시스템 인증 브라우저로 연다 (구글은 WebView 안 로그인을 막는다).
  // 돌아온 주소(?code=...)를 웹에 넘기면 웹이 세션으로 바꾼다. PKCE 확인 값이 웹 저장소에 있어서 교환은 웹이 한다.
  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    if (!isAppUrl(e.nativeEvent.url)) return; // 우리 웹앱 페이지가 보낸 것만
    let msg: { type?: string; url?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type !== 'oauth' || typeof msg.url !== 'string' || !msg.url.startsWith('https://')) return;
    let back: string | null = null;
    try {
      const result = await WebBrowser.openAuthSessionAsync(msg.url, AUTH_REDIRECT);
      if (result.type === 'success') back = result.url;
    } catch {
      back = null;
    }
    ref.current?.injectJavaScript(`window.__ecoAuthFinish && window.__ecoAuthFinish(${JSON.stringify(back)}); true;`);
  }, []);

  const retry = useCallback(() => {
    setFailed(false);
    ref.current?.reload();
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <WebView
        ref={ref}
        source={{ uri: APP_URL }}
        style={styles.web}
        originWhitelist={['https://*', 'http://*', 'about:*', 'data:*', 'blob:*']}
        onShouldStartLoadWithRequest={onShouldStart}
        // target="_blank" 링크(읽기 원문 등)도 새 창 대신 외부 브라우저로
        setSupportMultipleWindows={false}
        onOpenWindow={(e) => {
          const url = e.nativeEvent.targetUrl;
          if (url) Linking.openURL(url).catch(() => {});
        }}
        onNavigationStateChange={onNav}
        injectedJavaScriptBeforeContentLoaded={INJECT_BEFORE}
        onMessage={onMessage}
        onError={() => setFailed(true)}
        onHttpError={(e) => {
          if (e.nativeEvent.statusCode >= 500) setFailed(true);
        }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        )}
        // 기록·숲 데이터는 웹의 localStorage에 저장되므로 꼭 켠다
        domStorageEnabled
        javaScriptEnabled
        sharedCookiesEnabled
        pullToRefreshEnabled
        allowsBackForwardNavigationGestures
        // 화면 확대(핀치 줌)·가로 바운스 없이 앱처럼
        setBuiltInZoomControls={false}
        bounces={false}
        overScrollMode="never"
        textZoom={100}
        applicationNameForUserAgent="EcoPracticeApp/1.0"
      />
      {failed && (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.errorBox]}>
          <Text style={styles.errorTitle}>화면을 불러오지 못했어요</Text>
          <Text style={styles.errorBody}>인터넷 연결을 확인한 뒤 다시 시도해 주세요.</Text>
          <Pressable onPress={retry} style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Text style={styles.buttonText}>다시 시도</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  errorBox: { paddingHorizontal: 32, gap: 8 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#0F281E' },
  errorBody: { fontSize: 14, color: '#4F6B5E', textAlign: 'center' },
  button: { marginTop: 12, minHeight: 48, paddingHorizontal: 24, borderRadius: 999, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
