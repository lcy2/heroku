from social_core.backends.google import GoogleOAuth2
import requests

class IncrementalGoogle(GoogleOAuth2):
    def get_scope(self):
        scope = super(IncrementalGoogle, self).get_scope()
        if self.data.get('extrascope') == 'photos':
            scope = scope + ['https://picasaweb.google.com/data/', 'https://photos.googleapis.com/data/']
            #print scope
        return scope


def custom_load_extra_data(backend, details, response, uid, user, strategy, *args, **kwargs):
    social = kwargs.get('social') or backend.strategy.storage.user.get_social_auth(backend.name, uid)
    if social:
        extra_data = backend.extra_data(user, uid, response, details,
                                        *args, **kwargs)
        url = 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + extra_data['access_token']
        scope = requests.get(url).json()['scope'].split()
        extra_data.update({'scope': scope})

        social.set_extra_data(extra_data)
