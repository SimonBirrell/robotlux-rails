require 'rails_helper'

RSpec.describe Org, type: :model do

  it "should require a slug and name when creating an org" do

  	org = Org.create
  	expect(org.id).to be_nil

    # slug auto-created if there's a name
  	#org = Org.create name: 'Foo Bar'
  	#expect(org.id).to be_nil

  	org = Org.create name: 'Foo Bar', slug: 'foobar'
  	expect(org.id).to be_present

  end

  it "should require a valid slug" do

  	org = Org.create name: 'Foo Bar', slug: 'foobar'
  	expect(org.id).to be_present

  	org = Org.create name: 'Foo Bar', slug: 'foo bar'
  	expect(org.id).to be_nil

  	org = Org.create name: 'Foo Bar', slug: 'foo-bar'
  	expect(org.id).to be_nil

  	org = Org.create name: 'Foo Bar', slug: 'foo_bar'
  	expect(org.id).to be_present

  	org = Org.create name: 'Foo Bar', slug: 'foo2bar'
  	expect(org.id).to be_present

  	org = Org.create name: 'Foo Bar', slug: 'Foo_bar'
  	expect(org.id).to be_nil

  	org = Org.create name: 'Foo Bar', slug: ''
  	expect(org.id).to be_nil
  	
  end

  it "should require a unique slug" do

  	org = Org.create name: 'Foo Bar', slug: 'foobar'
  	expect(org.id).to be_present

  	org2 = Org.create name: 'Foo Bar', slug: 'foobar'
  	expect(org2.id).to be_nil

  	org2 = Org.create name: 'Foo Bar', slug: 'foobar2'
  	expect(org2.id).to be_present

  end

end
