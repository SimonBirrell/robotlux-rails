require 'rails_helper'

RSpec.describe "User gets their data", type: :request do 
	include Warden::Test::Helpers
    include ApiHelpers

    before(:all) do
    	# Check user created
        @password = "foobar999"
    	@user = FactoryGirl.create :user, password: @password
    	expect(@user).to be_present
    	expect(User.count).to eq 1
    	expect(@user.role). to eq 'user'

    	@redis = Redis.new
    end

    it "should be able to sign in and get my_data" do
        sign_in_user_and_check_redis_data

        headers = json_headers
        headers = add_authentication_to_headers(headers, @user.email, @auth_token)
        get "/users/my_data", nil, headers
        expect(response).to have_http_status 200

        json = JSON.parse(response.body)['user']
        expect(json['email']).to eq @user.email
        expect(json['auth_token']).to eq @auth_token
        expect(json['org_id']).to eq @user.org.id
        expect(json['org_slug']).to eq @user.org.slug
    end

    it "should not be able to get my_data without passing email and token in headers" do
        sign_in_user_and_check_redis_data

        get "/users/my_data", nil, json_headers
        expect(response).to have_http_status 401
    end

    it "should not be able to get my_data with incorrect email and token in headers" do
        sign_in_user_and_check_redis_data

        headers = json_headers
        headers = add_authentication_to_headers(headers, @user.email, "wrong_token")
        get "/users/my_data", nil, headers
        expect(response).to have_http_status 401
    end

    def sign_in_user_and_check_redis_data
        old_auth_token = @user.authentication_token
        expect(old_auth_token).to be_present

        # Sign In
        sign_in_info = sign_in_user(@user, @password)
        @auth_token = sign_in_info['auth_token']

        # Check auth token has changed
        expect(@auth_token).to be_present
        expect(@auth_token).not_to eq old_auth_token

        # Check REDIS now contains new auth_token
        user_details = LuxserverInterface.get_browser_details(@auth_token)
        expect(user_details['email']).to eq @user.email
        expect(user_details['name']).to eq @user.name
        expect(user_details['org_slug']).to eq @user.org.slug
    end

    def sign_in_user(user, password=nil, extra_params={})
        params = { email: @user.email, password: @password }.merge(extra_params)
        post "/users/sign_in", params.to_json, json_headers
        expect(response).to have_http_status 201
        sign_in_info = JSON.parse(response.body)
        sign_in_info['user']
    end

end