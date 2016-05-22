module ApiHelpers

    require "fakeredis"
    
    def sign_in(user, password=nil, extra_params={})
        password ||= 'secret123'
        params = { email: user.email, password: password }.merge(extra_params)
        post "/api/v1/users/sign_in", params.to_json, json_headers
        expect(response).to have_http_status 201
        sign_in_info = JSON.parse(response.body)
        sign_in_info['user']
    end

    def sign_out(user, email, auth_token)
        params = { }
        headers = add_authentication_to_headers(json_headers, email, auth_token)
        delete "/api/v1/users/sign_out", params.to_json, headers
        expect(response).to have_http_status 204      
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