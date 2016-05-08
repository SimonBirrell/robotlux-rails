module ApiHelpers

    def sign_in(user)
        params = { email: user.email, password: 'secret123' }
        post "/api/v1/users/sign_in", params.to_json, { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' }
        expect(response).to have_http_status 201
        sign_in_info = JSON.parse(response.body)
        sign_in_info['user']
    end

    def json_headers
        { 
            'Content-Type' => 'application/json', 
            'Accept' => 'application/json',
        }
    end

    def add_authentication_to_headers(headers, email, auth_token)
        headers['X-API-EMAIL'] = email
        headers['X-API-TOKEN'] = auth_token
        headers
    end

    def create_user(options={})
        user = FactoryGirl.create :user, options
        expect(user.id).to be_present
        user.confirm
        user
    end

end