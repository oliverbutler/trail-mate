import { Button, SafeAreaView, Text, View, TextInput } from 'react-native';
import { api, useUserStore } from './api';
import { Controller, useForm } from 'react-hook-form';

export default function Page() {
  const { auth, updateAuth } = useUserStore();

  const form = useForm<{
    username: string;
    password: string;
  }>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const loginResult = api.auth.login.useMutation({
    onSuccess: (data) => {
      updateAuth({
        status: 'authenticated',
        user: data.body.user,
        accessToken: data.body.accessToken,
        refreshTokenId: data.body.refreshTokenId,
        refreshToken: data.body.refreshToken,
      });
    },
  });

  const me = api.auth.getMe.useQuery(['test'], {});

  return (
    <SafeAreaView>
      <View className={'p-4 bg-gray-100'}>
        {auth.status === 'authenticated' ? (
          <>
            <Text className={'text-xl font-bold'}>
              Hey {auth.user.username}
            </Text>
            <Button
              title={'Logout'}
              onPress={() => updateAuth({ status: 'unauthenticated' })}
            />
          </>
        ) : auth.status === 'verifying' ? (
          <Text>
            Please confirm your email by going to the email we sent you
          </Text>
        ) : (
          <View className={'w-full flex flex-col gap-4'}>
            <Text>Username:</Text>
            <Controller
              control={form.control}
              name={'username'}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  autoCapitalize={'none'}
                  spellCheck={false}
                  className={'bg-white p-2 h-10'}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <Text>Password: </Text>
            <Controller
              control={form.control}
              name={'password'}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  secureTextEntry={true}
                  autoCapitalize={'none'}
                  spellCheck={false}
                  className={'bg-white p-2 h-10'}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <Button
              title={loginResult.isLoading ? 'Loading...' : 'Login'}
              disabled={loginResult.isLoading}
              onPress={() => {
                form.handleSubmit((data) => {
                  loginResult.mutate({
                    body: {
                      username: data.username,
                      password: data.password,
                    },
                  });
                })();
              }}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
