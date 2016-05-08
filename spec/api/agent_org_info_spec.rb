require 'rails_helper'

RSpec.describe "Agent gets Org info", type: :request, focus: false do 
	include Warden::Test::Helpers

	it "won't allow unauthenticated user to get org info" do
		org = FactoryGirl.create :org

		get "/api/v1/orgs/#{org.id}/agents_info", nil, json_headers

    	# test for the 401 status-code
    	expect(response).to have_http_status 401
	end
	
    it "won't allow badly authenticated user to get org info" do
        org = FactoryGirl.create :org
        user = FactoryGirl.create :user
        expect(user.id).to be_present
        user.confirm

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = 'wrong_token'

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents_info"
        get url, nil, headers

        expect(response).to have_http_status 401
    end

    it "allows Devise authenticated user to get org info" do
        org = FactoryGirl.create :org
        agent1 = FactoryGirl.create :agent, org: org, slug: 'foo'
        agent2 = FactoryGirl.create :agent, org: org, slug: 'bar'
        user = FactoryGirl.create :user
        expect(user.id).to be_present
        user.confirm

        # Sign In
        sign_in_info = sign_in(user)
        auth_token = sign_in_info['auth_token']

        headers = json_headers
        headers = add_authentication_to_headers(headers, user.email, auth_token)
        url = "/api/v1/orgs/#{org.id}/agents_info"
        get url, nil, headers

        expect(response).to have_http_status 200
        json = JSON.parse(response.body)
        expect(json['id']).to eq org.id
        expect(json['name']).to eq org.name
        expect(json['slug']).to eq org.slug

        agents = json['agents']
        puts agents.inspect
        expect(agents).to be_present
        agents.each do |agent|
            expect(agent['id']).to be_present
            expect(agent['name']).to be_present
            expect(agent['slug']).to be_present
        end

        puts json.inspect
    end

    private
    
        def sign_in(user)
            params = { email: user.email, password: 'secret123' }
            post "/users/sign_in", params.to_json, { 'CONTENT_TYPE' => 'application/json', 'ACCEPT' => 'application/json' }
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

end