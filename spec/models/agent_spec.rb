require 'rails_helper'

RSpec.describe Agent, type: :model do

	before(:all) do
		@org = FactoryGirl.create :org
	end

	it "should require a slug and org when creating an agent" do

	  	agent = Agent.create
	  	expect(agent.id).to be_nil

	  	agent = Agent.create slug: 'foo'
	  	expect(agent.id).to be_nil

	  	agent = Agent.create slug: 'foo', org: @org
	  	expect(agent.id).to be_present

	end

	it "should require a valid slug" do

  		agent = Agent.create org: @org, slug: 'foobar'
  		expect(agent.id).to be_present

  		agent = Agent.create org: @org, slug: 'foo bar'
  		expect(agent.id).to be_nil

  		agent = Agent.create org: @org, slug: 'foo-bar'
  		expect(agent.id).to be_nil

  		agent = Agent.create org: @org, slug: 'foo_bar'
  		expect(agent.id).to be_present

  		agent = Agent.create org: @org, slug: 'foo2bar'
  		expect(agent.id).to be_present

  		agent = Agent.create org: @org, slug: 'Foo_bar'
  		expect(agent.id).to be_nil

  		agent = Agent.create org: @org, slug: ''
  		expect(agent.id).to be_nil
  	
	end

	it "should require a slug that is unique to the organization" do

  		agent = Agent.create org: @org, slug: 'foobar'
  		expect(agent.id).to be_present

  		agent = Agent.create org: @org, slug: 'foobar'
  		expect(agent.id).to be_nil

  		org2 = FactoryGirl.create :org

  		agent = Agent.create org: org2, slug: 'foobar'
  		expect(agent.id).to be_present

	end

  it "should create a user when creating an agent and destroy it when destroying" do
      n = User.count
      agent = FactoryGirl.create :agent
      expect(User.count).to eq n + 1
      expect(agent.user.id).to be_present

      agent.destroy!
      expect(User.count).to eq n
  end

	it "should auto-create a name if one is absent" do

  		agent = Agent.create org: @org, slug: 'foo_bar'
  		expect(agent.id).to be_present
  		expect(agent.name).to eq 'Foo Bar'

	end

end
